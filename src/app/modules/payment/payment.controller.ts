import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PaymentService } from "./payment.service";

export const PaymentController = {
  deliveryCheckout: catchAsync(async (req, res) => {
    const result = await PaymentService.createCheckoutSession({
      deliveryId: req.body.deliveryId,
      customerEmail: req.body.customerEmail,
      userId: (req.user as any).id,
    });

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Checkout session created",
      data: result,
    });
  }),

  stripeWebhook: catchAsync(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const ok = await PaymentService.handleWebhook(req.body, sig);
    res.status(200).send({ received: ok });
  }),

  adminPayout: catchAsync(async (req, res) => {
    const result = await PaymentService.payoutToDriver(req.body.deliveryId);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Payout processed",
      data: result,
    });
  }),
};