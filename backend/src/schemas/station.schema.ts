import { z } from "zod";
import { CONNECTOR_TYPES } from "../models/station.model.js";

const text = (field: string, min: number, max: number) =>
  z
    .string({
      required_error: `${field} es obligatorio`,
      invalid_type_error: `${field} debe ser texto`,
    })
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar los ${max} caracteres`);

const bool = (field: string) =>
  z.boolean({ invalid_type_error: `${field} debe ser true o false` });

export const stationSchema = z.object({
  name: text("El nombre", 3, 80),
  operator: text("El operador", 2, 60),
  city: text("La ciudad", 2, 60),
  address: text("La dirección", 5, 120),
  connectorType: z.enum(CONNECTOR_TYPES, {
    errorMap: () => ({ message: `El conector debe ser uno de: ${CONNECTOR_TYPES.join(", ")}` }),
  }),
  powerKw: z
    .number({
      required_error: "La potencia es obligatoria",
      invalid_type_error: "La potencia debe ser un número",
    })
    .min(1, "La potencia mínima es 1 kW")
    .max(1000, "La potencia máxima es 1000 kW"),
  pricePerKwh: z
    .number({
      required_error: "El precio por kWh es obligatorio",
      invalid_type_error: "El precio debe ser un número",
    })
    .min(0, "El precio no puede ser negativo"),
  renewable: bool("renewable").default(false),
  open24h: bool("open24h").default(false),
  available: bool("available").default(true),
  installedAt: z.coerce
    .date({
      errorMap: () => ({ message: "La fecha de instalación es obligatoria y debe ser válida (YYYY-MM-DD)" }),
    })
    .refine((d) => d.getTime() <= Date.now(), "La fecha de instalación no puede ser futura"),
});

// PUT: reemplazo completo / PATCH: actualización parcial
// (los campos desconocidos como id o createdBy se descartan)
export const createStationSchema = stationSchema;
export const replaceStationSchema = stationSchema;
export const updateStationSchema = stationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Enviá al menos un campo para actualizar");

const boolQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
  search: z.string().trim().max(80).optional(),
  city: z.string().trim().max(60).optional(),
  connectorType: z.enum(CONNECTOR_TYPES).optional(),
  minPower: z.coerce.number().min(0).optional(),
  available: boolQuery,
  renewable: boolQuery,
  sort: z
    .enum(["newest", "oldest", "power", "price", "name"])
    .default("newest"),
});

export type StationInput = z.infer<typeof stationSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
