import { Types } from "mongoose";
import { VEHICLE_TYPE } from "../user/user.interface";

export enum DELIVERY_STATUS {
  OPEN = "OPEN",
  REQUESTED = "REQUESTED",
  BID_SENT = "BID_SENT",
  ACCEPTED = "ACCEPTED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAID = "PAID",
  IN_DELIVERY = "IN_DELIVERY",
  DELIVERED_BY_DRIVER = "DELIVERED_BY_DRIVER",
  DELIVERED_CONFIRMED = "DELIVERED_CONFIRMED",
  PAYOUT_DONE = "PAYOUT_DONE",
  CANCELLED = "CANCELLED",
  CANCELLED_BY_DRIVER = "CANCELLED_BY_DRIVER",
}

export enum OFFER_STATUS {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

export type IGeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export type ILocation = {
  address?: string;
  point: IGeoPoint;
};

export type IReceiver = {
  name: string;
  phone: string;
  note?: string;
};

export type IParcel = {
  type?: string;
  size?: string;
  weightKg?: number;
  description?: string;
  isFragile?: boolean;
  isLiquid?: boolean;
  isValuable?: boolean;
  photos?: string[];
};

export type IPricingSnapshot = {
  currency: string;
  version: number;

  distanceKm: number;

  breakdown: {
    baseFee: number;
    distanceFare: number;
    weightFare: number;
    raw: number;
  };

  estimatedFare: number;
  suggestedRange: {
    low: number;
    high: number;
  };
};

export type IDelivery = {
  customerId: Types.ObjectId;
  selectedDriverId?: Types.ObjectId | null;

  vehicleType: VEHICLE_TYPE;

  pickup: ILocation;
  dropoff: ILocation;

  receiver: IReceiver;
  parcel: IParcel;
  pricing: IPricingSnapshot;

  customerOfferFare: number; // offer your fare
  status: DELIVERY_STATUS;

  // offer/bid
  acceptedOfferId?: Types.ObjectId | null;

  // payment (webhook-ready)
  payment?: {
    intentId?: string | null;
    status?: "PENDING" | "PAID" | "FAILED";
    paidAt?: Date | null;
  };

  driverTimeline?: {
    arrivedPickupAt?: Date | null;
    arrivedDropoffAt?: Date | null;
    startedAt?: Date | null;
    deliveredAt?: Date | null;
    customerConfirmedAt?: Date | null;
  };

  // rating (post-delivery)
  rating?: {
    customerToDriver?: {
      stars: number; // 1-5
      note?: string | null;
      ratedAt?: Date | null;
    } | null;
    driverToCustomer?: {
      stars: number; // 1-5
      note?: string | null;
      ratedAt?: Date | null;
    } | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type IDeliveryOffer = {
  deliveryId: Types.ObjectId;
  driverId: Types.ObjectId;
  offeredFare: number;
  note?: string;
  customerCounterFare?: number | null; // ✅ NEW
  status: OFFER_STATUS;
};
