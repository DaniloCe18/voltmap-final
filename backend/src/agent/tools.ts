import { tool } from "langchain";
import { z } from "zod";
import { isValidObjectId, type FilterQuery } from "mongoose";
import { CONNECTOR_TYPES, StationModel, type Station } from "../models/station.model.js";

/**
 * Herramientas del agente. Son sus "sensores y actuadores" (clase 13): la única forma
 * que tiene de conocer el mundo (la base de VoltMap) es llamándolas. Por eso no puede
 * inventar estaciones.
 */

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type StationLean = Station & { _id: unknown };

const summarize = (s: StationLean) => ({
  id: String(s._id),
  url: `/stations/${String(s._id)}`,
  nombre: s.name,
  operador: s.operator,
  ciudad: s.city,
  direccion: s.address,
  conector: s.connectorType,
  potenciaKw: s.powerKw,
  cargaRapida: s.powerKw >= 50,
  precioPorKwhARS: s.pricePerKwh,
  renovable: s.renewable,
  abierta24h: s.open24h,
  disponible: s.available,
});

export const searchStationsTool = tool(
  async ({ city, connectorType, minPowerKw, onlyAvailable, onlyRenewable, open24h, text, sortBy, limit }) => {
    const filter: FilterQuery<Station> = {};
    if (city) filter.city = new RegExp(escapeRegex(city), "i");
    if (connectorType) filter.connectorType = connectorType;
    if (minPowerKw !== undefined) filter.powerKw = { $gte: minPowerKw };
    if (onlyAvailable) filter.available = true;
    if (onlyRenewable) filter.renewable = true;
    if (open24h) filter.open24h = true;
    if (text) {
      const rx = new RegExp(escapeRegex(text), "i");
      filter.$or = [{ name: rx }, { operator: rx }, { address: rx }, { city: rx }];
    }
    const sort: Record<string, 1 | -1> =
      sortBy === "precio" ? { pricePerKwh: 1 } : sortBy === "potencia" ? { powerKw: -1 } : { name: 1 };

    const stations = await StationModel.find(filter).sort(sort).limit(Math.min(Math.max(Math.round(limit ?? 8), 1), 15)).lean<StationLean[]>();
    return JSON.stringify({ cantidad: stations.length, estaciones: stations.map(summarize) });
  },
  {
    name: "buscar_estaciones",
    description:
      "Busca estaciones de carga en la base de VoltMap con filtros. Usala siempre que el usuario pregunte dónde cargar, " +
      "por una ciudad, un conector, potencia, precio, disponibilidad o energía renovable. Devuelve JSON.",
    schema: z.object({
      city: z.string().optional().describe("Ciudad (coincidencia parcial, ej: 'Córdoba')"),
      connectorType: z.enum(CONNECTOR_TYPES).optional().describe("Tipo de conector"),
      minPowerKw: z.number().optional().describe("Potencia mínima en kW (50 o más = carga rápida)"),
      onlyAvailable: z.boolean().optional().describe("Solo estaciones operativas"),
      onlyRenewable: z.boolean().optional().describe("Solo con energía 100% renovable"),
      open24h: z.boolean().optional().describe("Solo abiertas las 24 h"),
      text: z.string().optional().describe("Texto libre: nombre, operador o dirección"),
      sortBy: z.enum(["precio", "potencia", "nombre"]).optional().describe("Orden de los resultados"),
      limit: z.number().optional().describe("Máximo de resultados, entre 1 y 15 (por defecto 8)"),
    }),
  },
);

export const stationDetailTool = tool(
  async ({ id }) => {
    if (!isValidObjectId(id)) return JSON.stringify({ error: "id inválido" });
    const station = await StationModel.findById(id).lean<StationLean>();
    if (!station) return JSON.stringify({ error: "No existe una estación con ese id" });
    return JSON.stringify({
      ...summarize(station),
      instaladaEl: new Date(station.installedAt).toISOString().slice(0, 10),
    });
  },
  {
    name: "detalle_estacion",
    description: "Devuelve todos los datos de una estación a partir de su id (obtenido con buscar_estaciones).",
    schema: z.object({ id: z.string().describe("id de la estación") }),
  },
);

export const networkStatsTool = tool(
  async ({ city }) => {
    const match: FilterQuery<Station> = city ? { city: new RegExp(escapeRegex(city), "i") } : {};
    const [stats] = await StationModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          disponibles: { $sum: { $cond: ["$available", 1, 0] } },
          renovables: { $sum: { $cond: ["$renewable", 1, 0] } },
          rapidas: { $sum: { $cond: [{ $gte: ["$powerKw", 50] }, 1, 0] } },
          precioPromedioKwh: { $avg: "$pricePerKwh" },
          potenciaMaximaKw: { $max: "$powerKw" },
          ciudades: { $addToSet: "$city" },
        },
      },
    ]);
    if (!stats) return JSON.stringify({ total: 0 });
    delete stats._id;
    stats.precioPromedioKwh = Math.round(stats.precioPromedioKwh);
    return JSON.stringify(stats);
  },
  {
    name: "estadisticas_red",
    description:
      "Estadísticas de la red de carga (total, disponibles, renovables, rápidas, precio promedio, ciudades). " +
      "Opcionalmente filtradas por ciudad.",
    schema: z.object({ city: z.string().optional() }),
  },
);

export const estimateChargeTool = tool(
  async ({ batteryKwh, fromPercent, toPercent, powerKw, pricePerKwh }) => {
    // Validaciones acá (Gemini no acepta mínimos/máximos en el esquema de la herramienta)
    if (batteryKwh <= 0 || powerKw <= 0) {
      return JSON.stringify({ error: "La batería y la potencia tienen que ser mayores a cero" });
    }
    if (fromPercent < 0 || toPercent > 100 || toPercent <= fromPercent) {
      return JSON.stringify({ error: "Porcentajes inválidos: usá valores de 0 a 100 y el final mayor al inicial" });
    }
    const energyKwh = (batteryKwh * (toPercent - fromPercent)) / 100;
    // ~90 % de eficiencia; arriba del 80 % la carga se hace más lenta (curva de carga)
    const effectivePower = powerKw * 0.9 * (toPercent > 80 ? 0.75 : 1);
    const minutes = Math.round((energyKwh / effectivePower) * 60);
    return JSON.stringify({
      energiaKwh: Math.round(energyKwh * 10) / 10,
      minutosAprox: minutes,
      costoAproxARS: pricePerKwh !== undefined ? Math.round(energyKwh * pricePerKwh) : null,
    });
  },
  {
    name: "estimar_carga",
    description:
      "Calcula el tiempo y el costo aproximados de una carga. Usala en vez de hacer las cuentas de memoria.",
    schema: z.object({
      batteryKwh: z.number().describe("Capacidad de la batería en kWh (si no la sabés, usá 60)"),
      fromPercent: z.number().describe("Porcentaje inicial de batería (0 a 100)"),
      toPercent: z.number().describe("Porcentaje final de batería (0 a 100)"),
      powerKw: z.number().describe("Potencia del cargador en kW"),
      pricePerKwh: z.number().optional().describe("Precio por kWh en ARS"),
    }),
  },
);

export const agentTools = [searchStationsTool, stationDetailTool, networkStatsTool, estimateChargeTool];