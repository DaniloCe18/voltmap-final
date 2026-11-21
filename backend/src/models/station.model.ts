import { Schema, model, type InferSchemaType } from "mongoose";

export const CONNECTOR_TYPES = ["CCS2", "Type2", "CHAdeMO", "GBT", "NACS"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

/**
 * Estación de carga para vehículos eléctricos.
 * Tipos usados: texto, número, booleano, fecha y enum.
 */
const stationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    operator: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    connectorType: { type: String, enum: CONNECTOR_TYPES, required: true },
    powerKw: { type: Number, required: true, min: 1 },
    pricePerKwh: { type: Number, required: true, min: 0 },
    renewable: { type: Boolean, default: false },
    open24h: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    installedAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
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

// Carga rápida = 50 kW o más (dato derivado, no se guarda)
stationSchema.virtual("fastCharge").get(function (this: { powerKw: number }) {
  return this.powerKw >= 50;
});

stationSchema.index({ name: "text", city: "text", operator: "text", address: "text" });

export type Station = InferSchemaType<typeof stationSchema>;
export const StationModel = model("Station", stationSchema);
