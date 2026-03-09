export type IVehiclePricing = {
  vehicleType: string;

  baseFee: number;
  perKmRate: number;

  minFare: number;
  maxFare?: number | null;

  weight: {
    includedKg: number;
    perExtraKgRate: number;
    maxWeightKg?: number | null;
  };

  rounding: {
    mode: "NEAREST" | "UP" | "DOWN";
    step: number; // 1, 0.5, 5
  };

  range: {
    lowMultiplier: number;  // e.g. 0.85
    highMultiplier: number; // e.g. 1.2
  };

  isActive: boolean;
};

export type IPricingConfig = {
  currency: string;
  version: number;
  vehicles: IVehiclePricing[];
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IEstimateInput = {
  vehicleType: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  weightKg: number;
};

export type IEstimateResult = {
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
  suggestedRange: { low: number; high: number };
};