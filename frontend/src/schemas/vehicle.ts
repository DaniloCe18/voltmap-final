import { z } from "zod";
import { CONNECTOR_TYPES } from "../types/station";
import { BODY_TYPES } from "../types/vehicle";

const text = (field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar los ${max} caracteres`);

const num = (field: string, min: number, max: number, unit = "") =>
  z
    .number({ invalid_type_error: `${field} debe ser un número`, required_error: `${field} es obligatorio` })
    .min(min, `${field} mínimo: ${min}${unit}`)
    .max(max, `${field} máximo: ${max}${unit}`);

// Mismas reglas que el backend (backend/src/schemas/vehicle.schema.ts)
export const vehicleFormSchema = z.object({
  brand: text("La marca", 2, 40),
  model: text("El modelo", 1, 60),
  bodyType: z.enum(BODY_TYPES, { errorMap: () => ({ message: "Elegí una carrocería" }) }),
  connectorType: z.enum(CONNECTOR_TYPES, { errorMap: () => ({ message: "Elegí un conector" }) }),
  batteryKwh: num("La batería", 5, 250, " kWh"),
  rangeKm: num("La autonomía", 30, 1200, " km"),
  maxChargeKw: num("La potencia de carga", 2, 500, " kW"),
  priceUsd: num("El precio", 0, 1_000_000, " USD"),
  availableInArgentina: z.boolean(),
  releaseDate: z
    .string()
    .min(1, "La fecha de lanzamiento es obligatoria")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida")
    .refine((v) => new Date(v).getFullYear() >= 1990, "No puede ser anterior a 1990"),
  imageUrl: z.string().trim().url("Tiene que ser una URL válida (https://...)").or(z.literal("")),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
