import Stripe from "stripe";
import { StatusCodes } from "http-status-codes";
import stripe from "../../../config/stripe";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";

import { Delivery } from "../delivery/delivery.model";
import { DELIVERY_STATUS } from "../delivery/delivery.interface";
import { DeliveryOffer } from "../delivery/deliveryOffer.model";

import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  PayoutStatus,
  RefundStatus,
} from "./transaction.model";

import { User } from "../user/user.model";

const COMMISSION_RATE = 0.15; // 15%

// ---------- amount resolve (accepted offer > customer offer) ----------
const computeDeliveryAmountUsd = async (deliveryId: string) => {
  const delivery: any = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  let amountUsd = delivery.customerOfferFare;

  if (delivery.acceptedOfferId) {
    const offer = await DeliveryOffer.findById(delivery.acceptedOfferId).lean();
    if (offer?.offeredFare) amountUsd = offer.offeredFare;
  }

  if (!amountUsd || amountUsd <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid delivery amount");
  }

  return { delivery, amountUsd };
};

// ================== CHECKOUT SESSION CREATE ==================
const createCheckoutSession = async (input: {
  deliveryId: string;
  userId: string;
  customerEmail?: string;
}) => {
  const { deliveryId, userId, customerEmail } = input;

  const { delivery, amountUsd } = await computeDeliveryAmountUsd(deliveryId);

  if (delivery.customerId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not your delivery");
  }

  if (!delivery.selectedDriverId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "No driver selected for this delivery",
    );
  }
 

  // (optional) accepted না হলে payment বন্ধ রাখতে চাইলে uncomment করো
  // if (delivery.status !== DELIVERY_STATUS.ACCEPTED) {
  //   throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery is not accepted yet");
  // }

  // prevent duplicate checkout session
  const existingTrx = await Transaction.findOne({ deliveryId: delivery._id });
  if (
    existingTrx?.stripeSessionId &&
    existingTrx.status === TransactionStatus.PENDING
  ) {
    const oldSession = await stripe.checkout.sessions.retrieve(
      existingTrx.stripeSessionId,
    );
    if (oldSession?.url) {
      return {
        success: true,
        paymentUrl: oldSession.url,
        sessionId: oldSession.id,
      };
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"], // Card (+ ApplePay/GooglePay auto)
    mode: "payment",
    success_url: `${process.env.BASE_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/api/payments/cancel`,
    customer_email: customerEmail,
    client_reference_id: delivery._id.toString(), // booking-এর মতোই
    metadata: { delivery_id: delivery._id.toString() },

    // ✅ important: payment_intent metadata (backup events এ কাজে লাগবে)
    payment_intent_data: {
      metadata: {
        delivery_id: delivery._id.toString(),
        customer_id: delivery.customerId.toString(),
        driver_id: delivery.selectedDriverId.toString(),
      },
    },

    line_items: [
      {
        price_data: {
          currency: delivery.pricing?.currency ?? "usd",
          product_data: {
            name: `Parcel Delivery (${delivery.vehicleType})`,
            description: `Delivery ID #${delivery._id}`,
          },
          unit_amount: Math.round(amountUsd * 100),
        },
        quantity: 1,
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: "required",
  });

  const trx = await Transaction.create({
    deliveryId: delivery._id,
    customerId: delivery.customerId,
    driverId: delivery.selectedDriverId,
    amount: amountUsd,
    currency: delivery.pricing?.currency ?? "usd",
    method: PaymentMethod.CARD,
    stripeSessionId: session.id,
    status: TransactionStatus.PENDING,
  });

  // delivery update
  delivery.status = DELIVERY_STATUS.PAYMENT_PENDING;
  delivery.payment = { intentId: null, status: "PENDING", paidAt: null };
  await delivery.save();

  return {
    success: true,
    paymentUrl: session.url!,
    sessionId: session.id,
    transactionId: trx._id,
  };
};

// ================== WEBHOOK ==================
const handleWebhook = async (rawBody: Buffer, sig: string) => {
  let event: Stripe.Event;

  try {
    event = (stripe as unknown as Stripe).webhooks.constructEvent(
      rawBody,
      sig,
      config.stripe.webhookSecret as string,
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return false;
  }

  // ================= PAYMENT SUCCESS =================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const deliveryId =
      (session.client_reference_id as string) ||
      (session.metadata?.delivery_id as string);

    if (!deliveryId) return true;

    const delivery: any = await Delivery.findById(deliveryId);
    if (!delivery) return true;

    // Mark Delivery PAID (only if still pending)
    if (
      [DELIVERY_STATUS.PAYMENT_PENDING, DELIVERY_STATUS.ACCEPTED].includes(
        delivery.status,
      )
    ) {
      delivery.status = DELIVERY_STATUS.PAID;
      delivery.payment = {
        intentId: (session.payment_intent as string) ?? null,
        status: "PAID",
        paidAt: new Date(),
      };
      await delivery.save();
    }

    const paymentIntentId = session.payment_intent as string;

    // Retrieve chargeId (booking-এর মতোই)
    let chargeId: string | null = null;
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        {
          expand: ["latest_charge"],
        },
      );

      chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : (paymentIntent.latest_charge?.id ?? null);
    }

    if (!chargeId) {
      // chargeId না পেলেও transaction success mark করা যায়, কিন্তু payout এর জন্য দরকার হবে
      console.warn("Stripe charge not generated yet for session:", session.id);
    }

    await Transaction.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        $set: {
          status: TransactionStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
        },
      },
    );

    return true;
  }

  // ================= REFUND CONFIRMATION =================
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;

    await Transaction.findOneAndUpdate(
      { stripeChargeId: charge.id },
      {
        $set: {
          refundStatus: RefundStatus.SUCCEEDED,
          refundAmount: (charge.amount_refunded ?? 0) / 100,
          refundedAt: new Date(),
        },
      },
    );

    return true;
  }

  // ================= STRIPE CONNECT ONBOARDING =================
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    await User.findOneAndUpdate(
      { connectedAccountId: account.id },
      {
        $set: {
          onboardingCompleted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
        },
      },
    );

    return true;
  }

  return true;
};

// ================= PAYOUT TO DRIVER (Admin triggers) =================
const payoutToDriver = async (deliveryId: string) => {
  const delivery: any = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  if (delivery.status !== DELIVERY_STATUS.DELIVERED_CONFIRMED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Delivery is not confirmed delivered yet",
    );
  }

  if (!delivery.selectedDriverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No driver selected");
  }

  const driver = await User.findById(delivery.selectedDriverId);
  if (!driver?.connectedAccountId || !driver.payoutsEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Driver payout not enabled");
  }

  const trx = await Transaction.findOne({ deliveryId: delivery._id });
  if (!trx || trx.status !== TransactionStatus.SUCCEEDED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment not completed");
  }

  if (!trx.stripeChargeId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Stripe charge not found");
  }

  if (trx.payoutStatus === PayoutStatus.SUCCEEDED) {
    return { payoutAlreadyDone: true, transaction: trx, delivery };
  }

  const refundedAmount = trx.refundAmount ?? 0;
  const effectiveAmount = trx.amount - refundedAmount;

  // full refund → payout 0
  if (effectiveAmount <= 0) {
    await Transaction.findByIdAndUpdate(trx._id, {
      $set: { payoutStatus: PayoutStatus.SUCCEEDED },
    });
    delivery.status = DELIVERY_STATUS.PAYOUT_DONE;
    await delivery.save();
    return {
      payoutAlreadyDone: false,
      transaction: await Transaction.findById(trx._id),
      delivery,
    };
  }

  const commissionCents = Math.round(effectiveAmount * COMMISSION_RATE * 100);
  const payoutCents = Math.round(effectiveAmount * 100) - commissionCents;

  const transfer = await stripe.transfers.create({
    amount: payoutCents,
    currency: trx.currency,
    destination: driver.connectedAccountId,
    source_transaction: trx.stripeChargeId,
  });

  await Transaction.findByIdAndUpdate(trx._id, {
    $set: {
      commissionRate: COMMISSION_RATE,
      commissionAmount: Math.round(effectiveAmount * COMMISSION_RATE),
      driverReceiptAmount: payoutCents / 100,
      payoutStatus: PayoutStatus.SUCCEEDED,
      stripeTransferId: transfer.id,
      payoutAt: new Date(),
    },
  });

  delivery.status = DELIVERY_STATUS.PAYOUT_DONE;
  await delivery.save();

  return {
    payoutAlreadyDone: false,
    transaction: await Transaction.findById(trx._id),
    delivery,
  };
};

export const PaymentService = {
  createCheckoutSession,
  handleWebhook,
  payoutToDriver,
};
