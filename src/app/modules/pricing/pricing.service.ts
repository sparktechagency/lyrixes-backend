import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { PricingConfig } from "./pricing.model";
import { IEstimateInput, IEstimateResult } from "./pricing.interface";

let cachedConfig: any = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

const loadConfig = async () => {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) return cachedConfig;

  const config = await PricingConfig.findOne().lean();
  if (!config) throw new ApiError(StatusCodes.BAD_REQUEST, "Pricing config not set");

  cachedConfig = config;
  cachedAt = now;
  return config;
};

export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const roundFare = (value: number, mode: "NEAREST" | "UP" | "DOWN", step: number) => {
  const s = step || 1;
  const x = value / s;
  if (mode === "UP") return Math.ceil(x) * s;
  if (mode === "DOWN") return Math.floor(x) * s;
  return Math.round(x) * s;
};

export const calculateEstimateToDB = async (input: IEstimateInput): Promise<IEstimateResult> => {
  const config = await loadConfig();

  const vp = (config.vehicles || []).find(
    (v: any) => v.vehicleType === input.vehicleType && v.isActive,
  );
  if (!vp) throw new ApiError(StatusCodes.BAD_REQUEST, "Vehicle pricing not configured");

  const maxW = vp.weight?.maxWeightKg;
  if (maxW != null && input.weightKg > maxW) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Weight exceeds max limit for this vehicle");
  }

  const distanceKm = haversineKm(
    input.pickup.lat,
    input.pickup.lng,
    input.dropoff.lat,
    input.dropoff.lng,
  );

  const distanceFare = distanceKm * Number(vp.perKmRate || 0);

  const includedKg = Number(vp.weight?.includedKg || 0);
  const extraKg = Math.max(0, Number(input.weightKg || 0) - includedKg);
  const weightFare = extraKg * Number(vp.weight?.perExtraKgRate || 0);

  const baseFee = Number(vp.baseFee || 0);
  let raw = baseFee + distanceFare + weightFare;

  raw = Math.max(raw, Number(vp.minFare || 0));
  if (vp.maxFare != null) raw = Math.min(raw, Number(vp.maxFare));

  const final = roundFare(raw, vp.rounding?.mode || "NEAREST", Number(vp.rounding?.step || 1));

  const low = final * Number(vp.range?.lowMultiplier || 0.85);
  const high = final * Number(vp.range?.highMultiplier || 1.2);

  return {
    currency: config.currency || "usd",
    version: config.version,
    distanceKm: Number(distanceKm.toFixed(2)),
    breakdown: {
      baseFee,
      distanceFare: Number(distanceFare.toFixed(2)),
      weightFare: Number(weightFare.toFixed(2)),
      raw: Number(raw.toFixed(2)),
    },
    estimatedFare: Number(final.toFixed(2)),
    suggestedRange: {
      low: Number(low.toFixed(2)),
      high: Number(high.toFixed(2)),
    },
  };
};

export const getPricingConfigToDB = async () => {
  const config = await PricingConfig.findOne().lean();
  return config;
};

export const upsertPricingConfigToDB = async (userId: string, payload: any) => {
  const existing = await PricingConfig.findOne();
  if (!existing) {
    const created = await PricingConfig.create({
      ...payload,
      version: 1,
      updatedBy: userId,
    });
    cachedConfig = null;
    return created;
  }

  existing.currency = payload.currency ?? existing.currency;
  existing.vehicles = payload.vehicles ?? existing.vehicles;
  existing.version = (existing.version || 1) + 1;
  existing.updatedBy = userId as any;

  await existing.save();
  cachedConfig = null; // invalidate cache
  return existing;
};