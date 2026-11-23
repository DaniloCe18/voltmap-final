import { z } from "zod";
import { CONNECTOR_TYPES } from "../types/station";

const text = (field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar los ${max} caracteres`);

const num = (field: string) =>
  z.number({ invalid_type_error: `${field} debe ser un número`, required_error: `${field} es obligatorio` });

// Mismas reglas que el backend (backend/src/schemas/station.schema.ts)
export const stationFormSchema = z.object({
  name: text("El nombre", 3, 80),
  operator: text("El operador", 2, 60),
  city: text("La ciudad", 2, 60),
  address: text("La dirección", 5, 120),
  connectorType: z.enum(CONNECTOR_TYPES, {
    errorMap: () => ({ message: "Elegí un tipo de conector" }),
  }),
  powerKw: num("La potencia").min(1, "La potencia mínima es 1 kW").max(1000, "La potencia máxima es 1000 kW"),
  pricePerKwh: num("El precio").min(0, "El precio no puede ser negativo"),
  renewable: z.boolean(),
  open24h: z.boolean(),
  available: z.boolean(),
  installedAt: z
    .string()
    .min(1, "La fecha de instalación es obligatoria")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida")
    .refine((v) => new Date(v).getTime() <= Date.now(), "La fecha no puede ser futura"),
});

export type StationFormValues = z.infer<typeof stationFormSchema>;
