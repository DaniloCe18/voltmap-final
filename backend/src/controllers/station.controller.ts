import type { Request, Response } from "express";
import { isValidObjectId, type FilterQuery, type SortOrder } from "mongoose";
import { StationModel, type Station } from "../models/station.model.js";
import { deleteQuerySchema, listQuerySchema } from "../schemas/station.schema.js";

const NOT_FOUND = { error: "Estación no encontrada" };

const SORTS: Record<string, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  power: { powerKw: -1 },
  price: { pricePerKwh: 1 },
  name: { name: 1 },
};

// Las estaciones viejas pueden no tener el campo "active": se consideran activas
const ONLY_ACTIVE: FilterQuery<Station> = { active: { $ne: false } };

const isAdmin = (req: Request) => req.user?.role === "admin";

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

  const { page, limit, search, city, connectorType, minPower, available, renewable, sort, status } =
    parsed.data;

  // Ver estaciones dadas de baja es solo para admin
  if (status !== "active" && !isAdmin(req)) {
    const code = req.user ? 403 : 401;
    res.status(code).json({
      error: code === 401 ? "Iniciá sesión como admin para ver las bajas" : "Sin permisos para ver las bajas",
    });
    return;
  }

  const filter: FilterQuery<Station> = { ...baseFilter };
  if (status === "active") Object.assign(filter, ONLY_ACTIVE);
  if (status === "inactive") filter.active = false;
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
  const cities = await StationModel.distinct("city", ONLY_ACTIVE);
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
  // Una estación dada de baja no existe para el público (solo el admin la ve)
  if (!station || (station.active === false && !isAdmin(req))) {
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
  const changes = { ...req.body };
  // Reactivar ({ active: true }) limpia la fecha de baja; desactivar la registra
  if (changes.active === true) changes.deletedAt = null;
  if (changes.active === false) changes.deletedAt = new Date();

  const station = await StationModel.findByIdAndUpdate(id, changes, {
    new: true,
    runValidators: true,
  });
  if (!station) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(station);
}

// DELETE /api/stations/:id            → baja lógica (admin): se oculta y se puede reactivar
// DELETE /api/stations/:id?hard=true  → baja física (admin): se borra de la base
export async function deleteStation(req: Request, res: Response): Promise<void> {
  const parsed = deleteQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" });
    return;
  }

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }

  if (parsed.data.hard) {
    const deleted = await StationModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.status(204).send();
    return;
  }

  const station = await StationModel.findByIdAndUpdate(
    id,
    { active: false, deletedAt: new Date() },
    { new: true },
  );
  if (!station) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json({ message: "Estación dada de baja (baja lógica)", data: station });
}
