import { Schema, model } from "mongoose";
import { IDelivery, DELIVERY_STATUS } from "./delivery.interface";

const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    address: { type: String, default: null },
    point: { type: geoPointSchema, required: true },
  },
  { _id: false },
);

const deliverySchema = new Schema<IDelivery>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedDriverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    vehicleType: { type: String, required: true },

    pickup: { type: locationSchema, required: true },
    dropoff: { type: locationSchema, required: true },

    receiver: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      note: { type: String, default: null },
    },

    parcel: {
      type: { type: String, default: null },
      size: { type: String, default: null },
      weightKg: { type: Number, default: null },
      description: { type: String, default: null },
      isFragile: { type: Boolean, default: false },
      isLiquid: { type: Boolean, default: false },
      isValuable: { type: Boolean, default: false },
      photos: { type: [String], default: [] },
    },
    pricing: {
      currency: { type: String, default: "usd" },
      version: { type: Number, default: 1 },
      estimatedFare: { type: Number, default: 0 },
      suggestedRange: {
        low: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
      },
      breakdown: {
        baseFee: { type: Number, default: 0 },
        distanceFare: { type: Number, default: 0 },
        weightFare: { type: Number, default: 0 },
        raw: { type: Number, default: 0 },
      },
      distanceKm: { type: Number, default: 0 },
    },

    customerOfferFare: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.OPEN,
    },

    acceptedOfferId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryOffer",
      default: null,
    },

    payment: {
      intentId: { type: String, default: null },
      status: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED"],
        default: null,
      },
      paidAt: { type: Date, default: null },
    },

    driverTimeline: {
      arrivedPickupAt: { type: Date, default: null }, // ✅ NEW
      arrivedDropoffAt: { type: Date, default: null }, // ✅ NEW
      startedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      customerConfirmedAt: { type: Date, default: null },
    },

    rating: {
      customerToDriver: {
        stars: { type: Number, min: 1, max: 5, default: null },
        note: { type: String, default: null },
        ratedAt: { type: Date, default: null },
      },
      driverToCustomer: {
        stars: { type: Number, min: 1, max: 5, default: null },
        note: { type: String, default: null },
        ratedAt: { type: Date, default: null },
      },
    },
  },

  { timestamps: true, versionKey: false },
);

deliverySchema.index({ "pickup.point": "2dsphere" });
deliverySchema.index({ status: 1, selectedDriverId: 1, customerId: 1 });

export const Delivery = model<IDelivery>("Delivery", deliverySchema);
