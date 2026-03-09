import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { JwtPayload } from "jsonwebtoken";
import { USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";
import { Delivery } from "./delivery.model";
import { DeliveryOffer } from "./deliveryOffer.model";
import { DELIVERY_STATUS, OFFER_STATUS } from "./delivery.interface";
import stripe from "../../../config/stripe";
import { calculateEstimateToDB } from "../pricing/pricing.service";
import QueryBuilder from "../../builder/queryBuilder";
import { DeliveryAcceptance } from "./deliveryAcceptance.model";
import { ACCEPTANCE_STATUS } from "./deliveryAcceptance.interface";

const toPoint = (lat: number, lng: number) => ({
  type: "Point" as const,
  coordinates: [lng, lat] as [number, number],
});

export const createDeliveryToDB = async (user: JwtPayload, payload: any) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only customer can create delivery",
    );
  }

  const weightKg = Number(payload?.parcel?.weightKg ?? 0);

  const estimate = await calculateEstimateToDB({
    vehicleType: payload.vehicleType,
    pickup: { lat: payload.pickup.lat, lng: payload.pickup.lng },
    dropoff: { lat: payload.dropoff.lat, lng: payload.dropoff.lng },
    weightKg,
  });

  const doc = await Delivery.create({
    customerId: user.id,
    vehicleType: payload.vehicleType,
    pickup: {
      address: payload.pickup.address,
      point: toPoint(payload.pickup.lat, payload.pickup.lng),
    },
    dropoff: {
      address: payload.dropoff.address,
      point: toPoint(payload.dropoff.lat, payload.dropoff.lng),
    },
    receiver: payload.receiver,
    parcel: payload.parcel ?? {},
    pricing: estimate, // ✅ snapshot saved
    customerOfferFare: payload.customerOfferFare,
    status: DELIVERY_STATUS.OPEN,
  });

  return doc;
};


export const cancelDeliveryToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer can cancel delivery");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  if (delivery.customerId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  // ✅ only OPEN delivery can be cancelled
  if (delivery.status !== DELIVERY_STATUS.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only OPEN delivery can be cancelled",
    );
  }

  delivery.status = DELIVERY_STATUS.CANCELLED;
  await delivery.save();

  // optional cleanup
  await DeliveryAcceptance.deleteMany({ deliveryId: delivery._id });
  await DeliveryOffer.deleteMany({ deliveryId: delivery._id });

  return delivery;
};

export const changeDeliveryInfoToDB = async (
  user: JwtPayload,
  deliveryId: string,
  payload: any,
) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer can change delivery");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  if (delivery.customerId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  // ✅ only OPEN delivery can be changed
  if (delivery.status !== DELIVERY_STATUS.OPEN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only OPEN delivery can be changed",
    );
  }

  const nextVehicleType = payload.vehicleType ?? delivery.vehicleType;

  const nextPickup = {
    lat: payload?.pickup?.lat ?? delivery.pickup.point.coordinates[1],
    lng: payload?.pickup?.lng ?? delivery.pickup.point.coordinates[0],
    address: payload?.pickup?.address ?? delivery.pickup.address,
  };

  const nextDropoff = {
    lat: payload?.dropoff?.lat ?? delivery.dropoff.point.coordinates[1],
    lng: payload?.dropoff?.lng ?? delivery.dropoff.point.coordinates[0],
    address: payload?.dropoff?.address ?? delivery.dropoff.address,
  };

  const nextParcel = {
    type: payload?.parcel?.type ?? delivery.parcel?.type,
    size: payload?.parcel?.size ?? delivery.parcel?.size,
    weightKg: payload?.parcel?.weightKg ?? delivery.parcel?.weightKg,
    description: payload?.parcel?.description ?? delivery.parcel?.description,
    isFragile: payload?.parcel?.isFragile ?? delivery.parcel?.isFragile,
    isLiquid: payload?.parcel?.isLiquid ?? delivery.parcel?.isLiquid,
    isValuable: payload?.parcel?.isValuable ?? delivery.parcel?.isValuable,
    photos: payload?.parcel?.photos ?? delivery.parcel?.photos,
  };

  const nextReceiver = {
    name: payload?.receiver?.name ?? delivery.receiver.name,
    phone: payload?.receiver?.phone ?? delivery.receiver.phone,
    note: payload?.receiver?.note ?? delivery.receiver.note,
  };

  const nextCustomerOfferFare =
    payload?.customerOfferFare ?? delivery.customerOfferFare;

  const weightKg = Number(nextParcel?.weightKg ?? 0);

  // ✅ recalculate pricing snapshot
  const estimate = await calculateEstimateToDB({
    vehicleType: nextVehicleType,
    pickup: { lat: nextPickup.lat, lng: nextPickup.lng },
    dropoff: { lat: nextDropoff.lat, lng: nextDropoff.lng },
    weightKg,
  });

  delivery.vehicleType = nextVehicleType;
  delivery.pickup = {
    address: nextPickup.address,
    point: toPoint(nextPickup.lat, nextPickup.lng),
  };
  delivery.dropoff = {
    address: nextDropoff.address,
    point: toPoint(nextDropoff.lat, nextDropoff.lng),
  };
  delivery.receiver = nextReceiver;
  delivery.parcel = nextParcel as any;
  delivery.customerOfferFare = nextCustomerOfferFare;
  delivery.pricing = estimate as any;

  // ✅ reset any previous matching state just in case
  delivery.selectedDriverId = null;
  delivery.acceptedOfferId = null;
  delivery.status = DELIVERY_STATUS.OPEN;

  await delivery.save();

  // ✅ cleanup old acceptances / bids because info changed
  await DeliveryAcceptance.deleteMany({ deliveryId: delivery._id });
  await DeliveryOffer.deleteMany({ deliveryId: delivery._id });

  return delivery;
};

/**
 * inDrive-like matches:
 * - filter eligible drivers (online+available+vehicle match+nearby)
 * - sort by score (distance-based now; later rating/reliability add)
 */
export const getDriverMatchesToDB = async (
  user: JwtPayload,
  deliveryId: string,
  opts: any,
) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer can view matches");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not your delivery");
  }

  const radiusKm = Number(opts.radiusKm ?? 5);
  const limit = Number(opts.limit ?? 20);

  const [lng, lat] = delivery.pickup.point.coordinates;

  // geoNear on users
  const drivers = await User.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: radiusKm * 1000,
        query: {
          role: USER_ROLES.DRIVER,
          "driverStatus.isOnline": true,
          "driverStatus.isAvailable": true,
          "driverRegistration.vehicleInfo.vehicleType": delivery.vehicleType,
        },
      },
    },
    {
      $addFields: {
        score: {
          $subtract: [1000, { $divide: ["$distanceMeters", 10] }], // simple distance scoring
        },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $project: {
        password: 0,
        authentication: 0,
      },
    },
  ]);

  return { delivery, drivers };
};

export const driverAcceptOpenDeliveryToDB = async (user: JwtPayload, deliveryId: string) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  if (delivery.status !== DELIVERY_STATUS.OPEN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery is not open now");
  }

  // optional: vehicle match
  const driver = await User.findById(user.id).lean();
  const driverVehicle = driver?.driverRegistration?.vehicleInfo?.vehicleType;
  if (driverVehicle && driverVehicle !== delivery.vehicleType) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Vehicle type mismatch");
  }

  await DeliveryAcceptance.findOneAndUpdate(
    { deliveryId: delivery._id, driverId: user.id },
    { $set: { status: ACCEPTANCE_STATUS.ACCEPTED } },
    { upsert: true, new: true },
  );

  return { accepted: true };
};

export const getFindingCouriersToDB = async (user: JwtPayload, deliveryId: string) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  const acceptances = await DeliveryAcceptance.find({
    deliveryId,
    status: ACCEPTANCE_STATUS.ACCEPTED,
  })
    .populate("driverId", "firstName lastName profileImage driverStatus driverRegistration.vehicleInfo")
    .sort({ createdAt: -1 })
    .lean();

  const offers = await DeliveryOffer.find({
    deliveryId,
    status: OFFER_STATUS.PENDING,
  })
    .populate("driverId", "firstName lastName profileImage driverStatus driverRegistration.vehicleInfo")
    .sort({ createdAt: -1 })
    .lean();

  return { delivery, acceptances, offers };
};

// export const driverBidToDB = async (user: JwtPayload, payload: any) => {
//   if (user.role !== USER_ROLES.DRIVER)
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");

//   const delivery = await Delivery.findById(payload.deliveryId);
//   if (!delivery)
//     throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

//   // driver can bid when OPEN or REQUESTED (if selected driver)
//   if (delivery.status === DELIVERY_STATUS.OPEN) {
//     if (
//       !delivery.selectedDriverId ||
//       delivery.selectedDriverId.toString() !== user.id
//     ) {
//       throw new ApiError(StatusCodes.FORBIDDEN, "Not selected driver");
//     }
//   }
//   // } else if (delivery.status !== DELIVERY_STATUS.OPEN) {
//   //   throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot bid now");
//   // }

//   const offer = await DeliveryOffer.findOneAndUpdate(
//     { deliveryId: delivery._id, driverId: user.id },
//     {
//       $set: {
//         offeredFare: payload.offeredFare,
//         note: payload.note,
//         status: OFFER_STATUS.PENDING,
//       },
//     },
//     { upsert: true, new: true },
//   );

//   delivery.status = DELIVERY_STATUS.BID_SENT;
//   await delivery.save();

//   return offer;
// };

export const driverBidToDB = async (user: JwtPayload, payload: any) => {
  if (user.role !== USER_ROLES.DRIVER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");

  const delivery = await Delivery.findById(payload.deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  // ✅ only allow bid while still OPEN (customer hasn't selected anyone)
  if (delivery.status !== DELIVERY_STATUS.OPEN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot bid now");
  }

  const offer = await DeliveryOffer.findOneAndUpdate(
    { deliveryId: delivery._id, driverId: user.id },
    {
      $set: {
        offeredFare: payload.offeredFare,
        note: payload.note,
        status: OFFER_STATUS.PENDING,
      },
    },
    { upsert: true, new: true },
  );

  // ✅ DO NOT change delivery status here (keep OPEN)
  return offer;
};

 

export const customerSelectDriverToDB = async (
  user: JwtPayload,
  deliveryId: string,
  driverId: string,
) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");
  }

  // 1) delivery ownership + current status quick check (read-only)
  const delivery = await Delivery.findById(deliveryId).select("customerId status");
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }
  if (delivery.status !== DELIVERY_STATUS.OPEN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery is not selectable now");
  }

  // 2) driver eligibility check: accepted OR bid exists
  const [accepted, offered] = await Promise.all([
    DeliveryAcceptance.findOne({
      deliveryId,
      driverId,
      status: ACCEPTANCE_STATUS.ACCEPTED,
    }).select("_id"),
    DeliveryOffer.findOne({
      deliveryId,
      driverId,
      status: OFFER_STATUS.PENDING,
    }).select("_id"),
  ]);

  if (!accepted && !offered) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Driver did not accept or bid");
  }

  // 3) ✅ atomic select (prevents double-select race)
  const updated = await Delivery.findOneAndUpdate(
    { _id: deliveryId, customerId: user.id, status: DELIVERY_STATUS.OPEN },
    { $set: { selectedDriverId: driverId, status: DELIVERY_STATUS.ACCEPTED } },
    { new: true },
  );

  if (!updated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Already selected / not open");
  }

  return updated;
};

// export const requestDriverToDB = async (
//   user: JwtPayload,
//   deliveryId: string,
//   driverId: string,
// ) => {
//   if (user.role !== USER_ROLES.CUSTOMER)
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");
//   const delivery = await Delivery.findById(deliveryId);
//   if (!delivery)
//     throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
//   if (delivery.customerId.toString() !== user.id)
//     throw new ApiError(StatusCodes.FORBIDDEN, "Not your delivery");

//   if (
//     ![DELIVERY_STATUS.OPEN, DELIVERY_STATUS.BID_SENT].includes(delivery.status)
//   ) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Delivery is not requestable now",
//     );
//   }

//   // set selected driver + status requested
//   delivery.selectedDriverId = driverId as any;
//   delivery.status = DELIVERY_STATUS.REQUESTED;
//   await delivery.save();

//   return delivery;
// };

// export const driverAcceptDeliveryToDB = async (
//   user: JwtPayload,
//   deliveryId: string,
// ) => {
//   if (user.role !== USER_ROLES.DRIVER)
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");

//   const delivery = await Delivery.findById(deliveryId);
//   if (!delivery)
//     throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

//   // only selected driver can accept
//   if (
//     !delivery.selectedDriverId ||
//     delivery.selectedDriverId.toString() !== user.id
//   ) {
//     throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
//   }

//   if (delivery.status !== DELIVERY_STATUS.REQUESTED) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Delivery is not in REQUESTED state",
//     );
//   }

//   delivery.status = DELIVERY_STATUS.ACCEPTED;
//   await delivery.save();
//   return delivery;
// };



export const customerReplyBidToDB = async (
  user: JwtPayload,
  deliveryId: string,
  driverId: string,
  customerCounterFare: number,
) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");
  }

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id) throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");

  const offer = await DeliveryOffer.findOne({
    deliveryId,
    driverId,
    status: OFFER_STATUS.PENDING,
  });

  if (!offer) throw new ApiError(StatusCodes.NOT_FOUND, "No pending bid from driver");

  offer.customerCounterFare = customerCounterFare;
  await offer.save();

  return offer;
};

export const listOffersToDB = async (user: JwtPayload, deliveryId: string) => {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  // customer only own delivery, driver only if selected or bidder
  if (user.role === USER_ROLES.CUSTOMER) {
    if (delivery.customerId.toString() !== user.id)
      throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
  }

  const offers = await DeliveryOffer.find({ deliveryId }).populate(
    "driverId",
    "firstName lastName profileImage driverStatus",
  );
  return { delivery, offers };
};

export const customerAcceptOfferToDB = async (
  user: JwtPayload,
  deliveryId: string,
  offerId: string,
) => {
  if (user.role !== USER_ROLES.CUSTOMER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id)
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");

  const offer = await DeliveryOffer.findById(offerId);
  if (!offer || offer.deliveryId.toString() !== deliveryId) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Offer not found");
  }

  // accept this offer, reject others
  await DeliveryOffer.updateMany(
    { deliveryId, _id: { $ne: offerId } },
    { $set: { status: OFFER_STATUS.REJECTED } },
  );
  offer.status = OFFER_STATUS.ACCEPTED;
  await offer.save();

  delivery.acceptedOfferId = offer._id;
  delivery.selectedDriverId = offer.driverId;
  delivery.status = DELIVERY_STATUS.ACCEPTED;
  await delivery.save();

  return { delivery, offer };
};

/**
 * Book now: create stripe payment intent, store intentId.
 * webhook will mark PAID later.
 */
export const bookNowToDB = async (user: JwtPayload, deliveryId: string) => {
  if (user.role !== USER_ROLES.CUSTOMER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id)
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");

  if (delivery.status !== DELIVERY_STATUS.ACCEPTED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery is not accepted yet");
  }

  // amount = acceptedFare (offer) else customerOfferFare
  let amountUsd = delivery.customerOfferFare;
  if (delivery.acceptedOfferId) {
    const offer = await DeliveryOffer.findById(delivery.acceptedOfferId);
    if (offer) amountUsd = offer.offeredFare;
  }
  const currency = delivery.pricing?.currency ?? "usd";
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountUsd * 100),
    currency,
    metadata: {
      deliveryId: delivery._id.toString(),
      customerId: delivery.customerId.toString(),
      selectedDriverId: delivery.selectedDriverId?.toString() ?? "",
    },
    automatic_payment_methods: { enabled: true },
  });

  delivery.status = DELIVERY_STATUS.PAYMENT_PENDING;
  delivery.payment = {
    intentId: paymentIntent.id,
    status: "PENDING",
    paidAt: null,
  };
  await delivery.save();

  return {
    clientSecret: paymentIntent.client_secret,
    intentId: paymentIntent.id,
    delivery,
  };
};

export const driverStartJourneyToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.DRIVER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  if (
    !delivery.selectedDriverId ||
    delivery.selectedDriverId.toString() !== user.id
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
  }

  if (delivery.status !== DELIVERY_STATUS.PAID) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment not completed");
  }

  delivery.status = DELIVERY_STATUS.IN_DELIVERY;
  delivery.driverTimeline = {
    ...(delivery.driverTimeline ?? {}),
    startedAt: new Date(),
  };
  await delivery.save();
  return delivery;
};

export const driverArrivedPickupToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const delivery = await Delivery.findById(deliveryId);

  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  if (!delivery.selectedDriverId || delivery.selectedDriverId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
  }

  delivery.driverTimeline = {
    ...(delivery.driverTimeline ?? {}),
    arrivedPickupAt: new Date(),
  };

  await delivery.save();

  return delivery;
};

export const driverArrivedDropoffToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const delivery = await Delivery.findById(deliveryId);

  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  if (!delivery.selectedDriverId || delivery.selectedDriverId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
  }

  delivery.driverTimeline = {
    ...(delivery.driverTimeline ?? {}),
    arrivedDropoffAt: new Date(),
  };

  await delivery.save();

  return delivery;
};

export const driverMarkDeliveredToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.DRIVER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (
    !delivery.selectedDriverId ||
    delivery.selectedDriverId.toString() !== user.id
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
  }
  if (
    ![DELIVERY_STATUS.IN_DELIVERY, DELIVERY_STATUS.PAID].includes(
      delivery.status,
    )
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Not deliverable state");
  }

  delivery.status = DELIVERY_STATUS.DELIVERED_BY_DRIVER;
  delivery.driverTimeline = {
    ...(delivery.driverTimeline ?? {}),
    deliveredAt: new Date(),
  };
  await delivery.save();
  return delivery;
};

export const customerConfirmDeliveredToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.CUSTOMER)
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery)
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  if (delivery.customerId.toString() !== user.id)
    throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");

  if (delivery.status !== DELIVERY_STATUS.DELIVERED_BY_DRIVER) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Driver hasn't marked delivered yet",
    );
  }

  delivery.status = DELIVERY_STATUS.DELIVERED_CONFIRMED;
  delivery.driverTimeline = {
    ...(delivery.driverTimeline ?? {}),
    customerConfirmedAt: new Date(),
  };
  await delivery.save();
  return delivery;
};


export const rateDeliveryToDB = async (
  user: JwtPayload,
  deliveryId: string,
  payload: { stars: number; note?: string },
) => {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");

  // rating is allowed only after delivery confirmed or payout done
  if (
    delivery.status !== DELIVERY_STATUS.DELIVERED_CONFIRMED &&
    delivery.status !== DELIVERY_STATUS.PAYOUT_DONE
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery is not confirmed yet");
  }

  const stars = Number(payload.stars);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Stars must be between 1 and 5");
  }

  const note = payload.note?.trim() || null;

  // customer -> driver
  if (user.role === USER_ROLES.CUSTOMER) {
    if (delivery.customerId.toString() !== user.id) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Not yours");
    }
    if (!delivery.selectedDriverId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "No driver assigned");
    }
    if (delivery.rating?.customerToDriver?.stars) {
      throw new ApiError(StatusCodes.CONFLICT, "Already rated" );
    }

    // ensure we don't carry over undefined subfields from existing rating
    if (!delivery.rating) {
      delivery.rating = {} as any;
    }
    // clean any accidental undefined keys (could happen after previous edits)
    if (delivery.rating && delivery.rating.customerToDriver === undefined) delete (delivery.rating as any).customerToDriver;
    if (delivery.rating && delivery.rating.driverToCustomer === undefined) delete (delivery.rating as any).driverToCustomer;

    (delivery.rating as any).customerToDriver = {
      stars,
      note,
      ratedAt: new Date(),
    };

    await delivery.save();
    return delivery;
  }

  // driver -> customer
  if (user.role === USER_ROLES.DRIVER) {
    if (!delivery.selectedDriverId || delivery.selectedDriverId.toString() !== user.id) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
    }
    if (delivery.rating?.driverToCustomer?.stars) {
      throw new ApiError(StatusCodes.CONFLICT, "Already rated" );
    }

    if (!delivery.rating) {
      delivery.rating = {} as any;
    }
    // remove undefined to avoid mongoose cast issues
    if (delivery.rating && delivery.rating.customerToDriver === undefined) delete (delivery.rating as any).customerToDriver;
    if (delivery.rating && delivery.rating.driverToCustomer === undefined) delete (delivery.rating as any).driverToCustomer;

    (delivery.rating as any).driverToCustomer = {
      stars,
      note,
      ratedAt: new Date(),
    };

    await delivery.save();
    return delivery;
  }

  throw new ApiError(StatusCodes.FORBIDDEN, "Invalid role");
};

export const getMyDeliveriesToDB = async (user: JwtPayload, query: any) => {
  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only customer");
  }

  // ✅ server-side mandatory filter
  const baseQuery = Delivery.find({ customerId: user.id }).populate(
    "selectedDriverId",
    "firstName lastName profileImage driverStatus",
  );

  // ✅ QueryBuilder chaining
  const qb = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await qb.countTotal();
  const data = await qb.modelQuery.lean();

  return { meta, data };
};


export const getDriverMyDeliveriesToDB = async (user: JwtPayload, query: any) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const baseQuery = Delivery.find({ selectedDriverId: user.id })
    .populate("customerId", "firstName lastName profileImage phone")
    .populate("selectedDriverId", "firstName lastName profileImage driverStatus");

  const qb = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await qb.countTotal();
  const data = await qb.modelQuery.lean();

  return { meta, data };
};




export const getDriverHomeToDB = async (user: JwtPayload, query: any) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const radiusKm = Number(query.radiusKm ?? 5);
  const limit = Number(query.limit ?? 20);

  const driver = await User.findById(user.id).lean();
  if (!driver?.driverStatus?.location?.coordinates) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Driver location not set");
  }

  const [lng, lat] = driver.driverStatus.location.coordinates;

  const vehicleType = driver?.driverRegistration?.vehicleInfo?.vehicleType;
  if (!vehicleType) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Driver vehicleType not set");
  }

  const usersCollection = User.collection.name; // ✅ real collection name

  const available = await Delivery.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: radiusKm * 1000,
        query: {
          status: DELIVERY_STATUS.OPEN,
          vehicleType,
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },

    // ✅ lookup customer
    {
      $lookup: {
        from: usersCollection,
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
        pipeline: [
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              fullName: 1,
              // চাইলে image field যোগ করবেন (আপনার স্কিমা অনুযায়ী)
              // avatar: 1,
              // photoUrl: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

    // ✅ optional: UI-friendly name fallback
    {
      $addFields: {
        customerName: {
          $ifNull: [
            "$customer.fullName",
            {
              $trim: {
                input: { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
              },
            },
          ],
        },
      },
    },

    // ✅ keep response small & controlled
    {
      $project: {
        customerId: 1,
        customer: 1,
        customerName: 1,
        selectedDriverId: 1,
        vehicleType: 1,
        pickup: 1,
        dropoff: 1,
        receiver: { name: 1, note: 1 },
        parcel: 1,
        pricing: 1,
        customerOfferFare: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        distanceMeters: 1,
      },
    },
  ]);

  const activeStatuses = [
    DELIVERY_STATUS.ACCEPTED,
    DELIVERY_STATUS.PAYMENT_PENDING,
    DELIVERY_STATUS.PAID,
    DELIVERY_STATUS.IN_DELIVERY,
    DELIVERY_STATUS.DELIVERED_BY_DRIVER,
  ];

  const active = await Delivery.find({
    selectedDriverId: user.id,
    status: { $in: activeStatuses },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("customerId", "firstName lastName fullName") // ✅ schema অনুযায়ী
    .lean();

  return { available, active };
};

export const driverCancelDeliveryToDB = async (
  user: JwtPayload,
  deliveryId: string,
) => {
  if (user.role !== USER_ROLES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
  }

  const delivery = await Delivery.findById(deliveryId);

  if (!delivery) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery not found");
  }

  if (!delivery.selectedDriverId || delivery.selectedDriverId.toString() !== user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not assigned to you");
  }

  const allowedStatuses = [
    DELIVERY_STATUS.ACCEPTED,
    DELIVERY_STATUS.PAYMENT_PENDING,
    DELIVERY_STATUS.PAID,
  ];

  if (!allowedStatuses.includes(delivery.status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Driver cannot cancel at this stage",
    );
  }

  delivery.status = DELIVERY_STATUS.CANCELLED_BY_DRIVER;

  await delivery.save();

  return delivery;
};

// export const getDriverHomeToDB = async (user: JwtPayload, query: any) => {
//   if (user.role !== USER_ROLES.DRIVER) {
//     throw new ApiError(StatusCodes.FORBIDDEN, "Only driver");
//   }

//   const radiusKm = Number(query.radiusKm ?? 5);
//   const limit = Number(query.limit ?? 20);

//   // driver location check
//   const driver = await User.findById(user.id).lean();
//   if (!driver?.driverStatus?.location?.coordinates) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Driver location not set");
//   }

//   const [lng, lat] = driver.driverStatus.location.coordinates;

//   /**
//    * 1️⃣ AVAILABLE JOBS (OPEN nearby)
//    */
//   const available = await Delivery.aggregate([
//     {
//       $geoNear: {
//         near: { type: "Point", coordinates: [lng, lat] },
//         distanceField: "distanceMeters",
//         spherical: true,
//         maxDistance: radiusKm * 1000,
//         query: {
//           status: DELIVERY_STATUS.OPEN,
//           vehicleType: driver?.driverRegistration?.vehicleInfo?.vehicleType,
//         },
//       },
//     },
//     { $limit: limit },
//   ]);

//   // /**
//   //  * 2️⃣ REQUESTED TO ME
//   //  */
//   // const requested = await Delivery.find({
//   //   status: DELIVERY_STATUS.REQUESTED,
//   //   selectedDriverId: user.id,
//   // })
//   //   .sort({ createdAt: -1 })
//   //   .limit(limit)
//   //   .lean();

//   // ✅ NEW: driver home data
//   /**
//    * 3️⃣ ACTIVE JOBS
//    */
//   const activeStatuses = [
//     DELIVERY_STATUS.ACCEPTED,
//     DELIVERY_STATUS.PAYMENT_PENDING,
//     DELIVERY_STATUS.PAID,
//     DELIVERY_STATUS.IN_DELIVERY,
//     DELIVERY_STATUS.DELIVERED_BY_DRIVER,
//   ];

//   const active = await Delivery.find({
//     selectedDriverId: user.id,
//     status: { $in: activeStatuses },
//   })
//     .sort({ createdAt: -1 })
//     .limit(limit)
//     .lean();

//   return {
//     available,
//     active,
//   };
// };