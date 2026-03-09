import { Schema, model } from "mongoose";
import { IDeliveryOffer, OFFER_STATUS } from "./delivery.interface";

const deliveryOfferSchema = new Schema<IDeliveryOffer>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: "Delivery", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    offeredFare: { type: Number, required: true },
    note: { type: String, default: null },

    // ✅ NEW: customer reply bid
    customerCounterFare: { type: Number, default: null },

    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING,
    },
  },
  { timestamps: true, versionKey: false },
);

deliveryOfferSchema.index({ deliveryId: 1, driverId: 1 }, { unique: true });

export const DeliveryOffer = model<IDeliveryOffer>("DeliveryOffer", deliveryOfferSchema);