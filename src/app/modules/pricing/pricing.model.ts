import { Schema, model } from "mongoose";
import { IPricingConfig } from "./pricing.interface";

const VehiclePricingSchema = new Schema(
  {
    vehicleType: { type: String, required: true, unique: true },

    baseFee: { type: Number, required: true, default: 0 },
    perKmRate: { type: Number, required: true, default: 0 },

    minFare: { type: Number, required: true, default: 0 },
    maxFare: { type: Number, default: null },

    weight: {
      includedKg: { type: Number, default: 0 },
      perExtraKgRate: { type: Number, default: 0 },
      maxWeightKg: { type: Number, default: null },
    },

    rounding: {
      mode: { type: String, enum: ["NEAREST", "UP", "DOWN"], default: "NEAREST" },
      step: { type: Number, default: 1 },
    },

    range: {
      lowMultiplier: { type: Number, default: 0.85 },
      highMultiplier: { type: Number, default: 1.2 },
    },

    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    currency: { type: String, default: "usd" },
    version: { type: Number, default: 1 },
    vehicles: { type: [VehiclePricingSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

export const PricingConfig = model<IPricingConfig>("PricingConfig", PricingConfigSchema);