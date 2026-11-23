import { tool } from "langchain";
import { z } from "zod";
import { isValidObjectId, type FilterQuery } from "mongoose";
import { CONNECTOR_TYPES, StationModel, type Station } from "../models/station.model.js";
import { BODY_TYPES, VehicleModel, type Vehicle } from "../models/vehicle.model.js";

/**
 * Herramientas del agente sobre vehículos.
 * Igual que en tools.ts: los esquemas no llevan mínimos, máximos ni valores por defecto
 * porque Gemini los rechaza; los límites se aplican en el código.
 */

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const clampLimit = (n: number | undefined, def: number) => Math.min(Math.max(Math.round(n ?? def), 1), 15);

type VehicleLean = Vehicle & { _id: unknown };
type StationLean = Station & { _id: unknown };

const summarizeVehicle = (v: VehicleLean) => ({
  id: String(v._id),
  url: `/vehicles/${String(v._id)}`,
  marca: v.brand,
  modelo: v.model,
  carroceria: v.bodyType,
  conector: v.connectorType,
  bateriaKwh: v.batteryKwh,
  autonomiaKm: v.rangeKm,
  cargaMaximaKw: v.maxChargeKw,
  precioUsd: v.priceUsd,
  seVendeEnArgentina: v.availableInArgentina,
  lanzamiento: new Date(v.releaseDate).toISOString().slice(0, 10),
});

// Minutos para cargar del 10 al 80 % (~90 % de eficiencia)
const minutes10to80 = (batteryKwh: number, kw: number) => Math.round(((batteryKwh * 0.7) / (kw * 0.9)) * 60);

export const searchVehiclesTool = tool(
  async ({ brand, bodyType, connectorType, minRangeKm, maxPriceUsd, onlyArgentina, text, sortBy, limit }) => {
    const filter: FilterQuery<Vehicle> = { active: { $ne: false } };
    if (brand) filter.brand = new RegExp(escapeRegex(brand), "i");
    if (bodyType) filter.bodyType = bodyType;
    if (connectorType) filter.connectorType = connectorType;
    if (minRangeKm !== undefined) filter.rangeKm = { $gte: minRangeKm };
    if (maxPriceUsd !== undefined) filter.priceUsd = { $lte: maxPriceUsd };
    if (onlyArgentina) filter.availableInArgentina = true;
    if (text) {
      const rx = new RegExp(escapeRegex(text), "i");
      filter.$or = [{ brand: rx }, { model: rx }];
    }
    const sort: Record<string, 1 | -1> =
      sortBy === "precio"
        ? { priceUsd: 1 }
        : sortBy === "autonomia"
          ? { rangeKm: -1 }
          : sortBy === "bateria"
            ? { batteryKwh: -1 }
            : { brand: 1, model: 1 };

    const vehicles = await VehicleModel.find(filter).sort(sort).limit(clampLimit(limit, 8)).lean<VehicleLean[]>();
    return JSON.stringify({ cantidad: vehicles.length, vehiculos: vehicles.map(summarizeVehicle) });
  },
  {
    name: "buscar_vehiculos",
    description:
      "Busca autos eléctricos en el catálogo de VoltMap. Usala cuando pregunten qué auto conviene, por marca, " +
      "autonomía, precio, carrocería, conector o si se vende en Argentina. Devuelve JSON con la url de cada auto.",
    schema: z.object({
      brand: z.string().optional().describe("Marca (coincidencia parcial, ej: 'BYD')"),
      bodyType: z.enum(BODY_TYPES).optional().describe("Carrocería"),
      connectorType: z.enum(CONNECTOR_TYPES).optional().describe("Tipo de conector de carga"),
      minRangeKm: z.number().optional().describe("Autonomía mínima en km"),
      maxPriceUsd: z.number().optional().describe("Precio máximo en USD"),
      onlyArgentina: z.boolean().optional().describe("Solo los que se venden en Argentina"),
      text: z.string().optional().describe("Texto libre: marca o modelo"),
      sortBy: z.enum(["precio", "autonomia", "bateria", "nombre"]).optional().describe("Orden"),
      limit: z.number().optional().describe("Máximo de resultados, entre 1 y 15 (por defecto 8)"),
    }),
  },
);

export const vehicleDetailTool = tool(
  async ({ id }) => {
    if (!isValidObjectId(id)) return JSON.stringify({ error: "id inválido" });
    const v = await VehicleModel.findById(id).lean<VehicleLean>();
    if (!v || v.active === false) return JSON.stringify({ error: "No existe un vehículo con ese id" });
    return JSON.stringify({
      ...summarizeVehicle(v),
      kmPorKwh: Math.round((v.rangeKm / v.batteryKwh) * 10) / 10,
      minutos10a80EnCargaRapida: minutes10to80(v.batteryKwh, v.maxChargeKw),
    });
  },
  {
    name: "detalle_vehiculo",
    description: "Devuelve todos los datos de un auto a partir de su id (obtenido con buscar_vehiculos).",
    schema: z.object({ id: z.string().describe("id del vehículo") }),
  },
);

/**
 * Relación entre los dos modelos: dado un auto, qué estaciones de la red le sirven
 * (mismo conector) y cuánto tardaría en cada una.
 */
export const compatibleStationsTool = tool(
  async ({ vehicleId, city, limit }) => {
    if (!isValidObjectId(vehicleId)) return JSON.stringify({ error: "id de vehículo inválido" });
    const v = await VehicleModel.findById(vehicleId).lean<VehicleLean>();
    if (!v || v.active === false) return JSON.stringify({ error: "No existe un vehículo con ese id" });

    const filter: FilterQuery<Station> = {
      active: { $ne: false },
      available: true,
      connectorType: v.connectorType,
    };
    if (city) filter.city = new RegExp(escapeRegex(city), "i");

    const stations = await StationModel.find(filter)
      .sort({ powerKw: -1 })
      .limit(clampLimit(limit, 6))
      .lean<StationLean[]>();

    return JSON.stringify({
      vehiculo: `${v.brand} ${v.model}`,
      conector: v.connectorType,
      cantidad: stations.length,
      estaciones: stations.map((s) => {
        // La carga real la limita lo que acepta el auto
        const effectiveKw = Math.min(s.powerKw, v.maxChargeKw);
        return {
          id: String(s._id),
          url: `/stations/${String(s._id)}`,
          nombre: s.name,
          ciudad: s.city,
          potenciaEstacionKw: s.powerKw,
          potenciaEfectivaKw: effectiveKw,
          minutos10a80: minutes10to80(v.batteryKwh, effectiveKw),
          costo10a80ARS: Math.round(v.batteryKwh * 0.7 * s.pricePerKwh),
          renovable: s.renewable,
        };
      }),
    });
  },
  {
    name: "estaciones_compatibles",
    description:
      "Dado un vehículo (por id, obtenido con buscar_vehiculos), lista las estaciones disponibles con su mismo " +
      "conector, con el tiempo y el costo estimados de carga del 10 al 80 %. Opcionalmente filtra por ciudad.",
    schema: z.object({
      vehicleId: z.string().describe("id del vehículo"),
      city: z.string().optional().describe("Ciudad donde quiere cargar"),
      limit: z.number().optional().describe("Máximo de estaciones, entre 1 y 15 (por defecto 6)"),
    }),
  },
);

export const vehicleTools = [searchVehiclesTool, vehicleDetailTool, compatibleStationsTool];
