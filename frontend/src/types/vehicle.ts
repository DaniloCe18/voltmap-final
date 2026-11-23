import type { ConnectorType } from "./station";

export const BODY_TYPES = ["hatchback", "sedan", "suv", "pickup", "van"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_LABELS: Record<BodyType, string> = {
  hatchback: "Hatchback",
  sedan: "Sedán",
  suv: "SUV",
  pickup: "Pickup",
  van: "Utilitario",
};

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  connectorType: ConnectorType;
  batteryKwh: number;
  rangeKm: number;
  maxChargeKw: number;
  priceUsd: number;
  availableInArgentina: boolean;
  releaseDate: string;
  imageUrl?: string;
  kmPerKwh: number;
  active?: boolean;
  deletedAt?: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}
