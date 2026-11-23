import type { Request, Response } from "express";
import { isValidObjectId, type FilterQuery, type SortOrder } from "mongoose";
import { StationModel, type Station } from "../models/station.model.js";
import { listQuerySchema } from "../schemas/station.schema.js";

const NOT_FOUND = { error: "Estación no encontrada" };

const SORTS: Record<string, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  power: { powerKw: -1 },
  price: { pricePerKwh: 1 },
  name: { name: 1 },
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/stations  → listado general (público) con paginación, búsqueda y filtros
export async function listStations(req: Request, res: Response): Promise<void> {
  await sendList(req, res, {});
}

async function sendList(req: Request, res: Response, baseFilter: FilterQuery<Station>) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Parámetros de búsqueda inválidos",
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }

  const { page, limit, search, city, connectorType, minPower, available, renewable, sort } =
    parsed.data;

  const filter: FilterQuery<Station> = { ...baseFilter };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { city: rx }, { operator: rx }, { address: rx }];
  }
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (connectorType) filter.connectorType = connectorType;
  if (minPower !== undefined) filter.powerKw = { $gte: minPower };
  if (available !== undefined) filter.available = available;
  if (renewable !== undefined) filter.renewable = renewable;

  const [items, total] = await Promise.all([
    StationModel.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    StationModel.countDocuments(filter),
  ]);

  res.json({
    data: items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

// GET /api/stations/cities → ciudades disponibles (para el filtro del frontend)
export async function listCities(_req: Request, res: Response): Promise<void> {
  const cities = await StationModel.distinct("city");
  res.json({ data: cities.sort((a, b) => a.localeCompare(b, "es")) });
}

// GET /api/stations/:id
export async function getStation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const station = await StationModel.findById(id);
  if (!station) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(station);
}

// POST /api/stations  (admin) · guarda quién la cargó
export async function createStation(req: Request, res: Response): Promise<void> {
  const station = await StationModel.create({
    ...req.body,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
  });
  res.status(201).json(station);
}

// PUT /api/stations/:id   → reemplazo completo   (admin)
// PATCH /api/stations/:id → actualización parcial (admin)
// El dueño (createdBy) nunca se modifica: Zod descarta ese campo.
export async function updateStation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const station = await StationModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!station) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(station);
}

// DELETE /api/stations/:id  (admin)
export async function deleteStation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const station = await StationModel.findByIdAndDelete(id);
  if (!station) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.status(204).send();
}
