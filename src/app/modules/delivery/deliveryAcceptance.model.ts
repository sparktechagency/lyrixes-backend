import { Schema, model } from "mongoose";
import { IDeliveryAcceptance, ACCEPTANCE_STATUS } from "./deliveryAcceptance.interface";

const deliveryAcceptanceSchema = new Schema<IDeliveryAcceptance>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: "Delivery", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(ACCEPTANCE_STATUS),
      default: ACCEPTANCE_STATUS.ACCEPTED,
    },
  },
  { timestamps: true, versionKey: false },
);

deliveryAcceptanceSchema.index({ deliveryId: 1, driverId: 1 }, { unique: true });

export const DeliveryAcceptance = model<IDeliveryAcceptance>(
  "DeliveryAcceptance",
  deliveryAcceptanceSchema,
);