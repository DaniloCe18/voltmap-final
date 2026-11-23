import { z } from "zod";
import { CONNECTOR_TYPES } from "../models/station.model.js";
import { BODY_TYPES } from "../models/vehicle.model.js";

const text = (field: string, min: number, max: number) =>
  z
    .string({ required_error: `${field} es obligatorio`, invalid_type_error: `${field} debe ser texto` })
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar los ${max} caracteres`);

const num = (field: string, min: number, max: number, unit = "") =>
  z
    .number({ required_error: `${field} es obligatorio`, invalid_type_error: `${field} debe ser un número` })
    .min(min, `${field} mínimo: ${min}${unit}`)
    .max(max, `${field} máximo: ${max}${unit}`);

const bool = (field: string) => z.boolean({ invalid_type_error: `${field} debe ser true o false` });

export const vehicleSchema = z.object({
  brand: text("La marca", 2, 40),
  model: text("El modelo", 1, 60),
  bodyType: z.enum(BODY_TYPES, {
    errorMap: () => ({ message: `La carrocería debe ser una de: ${BODY_TYPES.join(", ")}` }),
  }),
  connectorType: z.enum(CONNECTOR_TYPES, {
    errorMap: () => ({ message: `El conector debe ser uno de: ${CONNECTOR_TYPES.join(", ")}` }),
  }),
  batteryKwh: num("La batería", 5, 250, " kWh"),
  rangeKm: num("La autonomía", 30, 1200, " km"),
  maxChargeKw: num("La potencia máxima de carga", 2, 500, " kW"),
  priceUsd: num("El precio", 0, 1_000_000, " USD"),
  availableInArgentina: bool("availableInArgentina").default(false),
  releaseDate: z.coerce
    .date({ errorMap: () => ({ message: "La fecha de lanzamiento es obligatoria y debe ser válida (YYYY-MM-DD)" }) })
    .refine((d) => d.getFullYear() >= 1990, "La fecha de lanzamiento no puede ser anterior a 1990"),
  imageUrl: z.string().trim().url("La imagen debe ser una URL válida").or(z.literal("")).optional(),
});

export const createVehicleSchema = vehicleSchema;
export const replaceVehicleSchema = vehicleSchema;
// PATCH: campos sueltos, o { "active": true } para reactivar una baja lógica
export const updateVehicleSchema = vehicleSchema
  .partial()
  .extend({ active: bool("active").optional() })
  .refine((data) => Object.keys(data).length > 0, "Enviá al menos un campo para actualizar");

const boolQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

export const vehicleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
  search: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(40).optional(),
  bodyType: z.enum(BODY_TYPES).optional(),
  connectorType: z.enum(CONNECTOR_TYPES).optional(),
  minRangeKm: z.coerce.number().min(0).optional(),
  availableInArgentina: boolQuery,
  sort: z.enum(["newest", "range", "price", "battery", "name"]).default("newest"),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
