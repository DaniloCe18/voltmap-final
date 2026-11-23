import { Schema, model, type InferSchemaType } from "mongoose";
import { CONNECTOR_TYPES } from "./station.model.js";

export const BODY_TYPES = ["hatchback", "sedan", "suv", "pickup", "van"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

/**
 * Vehículo eléctrico (modelo de auto).
 * Tipos usados: texto, número, booleano, fecha y enum.
 * Se relaciona con las estaciones por el tipo de conector.
 */
const vehicleSchema = new Schema(
  {
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    bodyType: { type: String, enum: BODY_TYPES, required: true },
    connectorType: { type: String, enum: CONNECTOR_TYPES, required: true },
    batteryKwh: { type: Number, required: true, min: 1 },
    rangeKm: { type: Number, required: true, min: 1 },
    maxChargeKw: { type: Number, required: true, min: 1 },
    priceUsd: { type: Number, required: true, min: 0 },
    availableInArgentina: { type: Boolean, default: false },
    releaseDate: { type: Date, required: true },
    // Foto del vehículo (URL en almacenamiento externo; se agrega en un PR posterior)
    imageUrl: { type: String, default: "" },
    // Baja lógica (active=false) y física (se borra el documento)
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

// Eficiencia aproximada (km por kWh): dato derivado, no se guarda
vehicleSchema.virtual("kmPerKwh").get(function (this: { rangeKm: number; batteryKwh: number }) {
  return Math.round((this.rangeKm / this.batteryKwh) * 10) / 10;
});

export type Vehicle = InferSchemaType<typeof vehicleSchema>;
export const VehicleModel = model("Vehicle", vehicleSchema);
