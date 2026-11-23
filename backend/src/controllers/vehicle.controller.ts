import type { Request, Response } from "express";
import { isValidObjectId, type FilterQuery, type SortOrder } from "mongoose";
import { VehicleModel, type Vehicle } from "../models/vehicle.model.js";
import { vehicleListQuerySchema } from "../schemas/vehicle.schema.js";
import { deleteQuerySchema } from "../schemas/station.schema.js";

const NOT_FOUND = { error: "Vehículo no encontrado" };

// Los documentos sin el campo "active" se consideran activos
const ONLY_ACTIVE: FilterQuery<Vehicle> = { active: { $ne: false } };

const SORTS: Record<string, Record<string, SortOrder>> = {
  newest: { releaseDate: -1 },
  range: { rangeKm: -1 },
  price: { priceUsd: 1 },
  battery: { batteryKwh: -1 },
  name: { brand: 1, model: 1 },
};

const isAdmin = (req: Request) => req.user?.role === "admin";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/vehicles → listado público con paginación, búsqueda y filtros
export async function listVehicles(req: Request, res: Response): Promise<void> {
  const parsed = vehicleListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Parámetros de búsqueda inválidos",
      details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }
  const { page, limit, search, brand, bodyType, connectorType, minRangeKm, availableInArgentina, sort, status } =
    parsed.data;

  // Ver las bajas lógicas es solo para admin
  if (status !== "active" && !isAdmin(req)) {
    const code = req.user ? 403 : 401;
    res.status(code).json({
      error: code === 401 ? "Iniciá sesión como admin para ver las bajas" : "Sin permisos para ver las bajas",
    });
    return;
  }

  const filter: FilterQuery<Vehicle> = {};
  if (status === "active") Object.assign(filter, ONLY_ACTIVE);
  if (status === "inactive") filter.active = false;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ brand: rx }, { model: rx }];
  }
  if (brand) filter.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
  if (bodyType) filter.bodyType = bodyType;
  if (connectorType) filter.connectorType = connectorType;
  if (minRangeKm !== undefined) filter.rangeKm = { $gte: minRangeKm };
  if (availableInArgentina !== undefined) filter.availableInArgentina = availableInArgentina;

  // Consulta y conteo en paralelo (concurrencia con Promise.all)
  const [items, total] = await Promise.all([
    VehicleModel.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    VehicleModel.countDocuments(filter),
  ]);

  res.json({ data: items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

// GET /api/vehicles/brands → marcas con vehículos activos (para el filtro del frontend)
export async function listBrands(_req: Request, res: Response): Promise<void> {
  const brands = await VehicleModel.distinct("brand", ONLY_ACTIVE);
  res.json({ data: brands.sort((a, b) => a.localeCompare(b, "es")) });
}

// GET /api/vehicles/:id
export async function getVehicle(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const vehicle = await VehicleModel.findById(id);
  // Un vehículo dado de baja no existe para el público (solo el admin lo ve)
  if (!vehicle || (vehicle.active === false && !isAdmin(req))) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(vehicle);
}

// POST /api/vehicles (admin)
export async function createVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await VehicleModel.create({
    ...req.body,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
  });
  res.status(201).json(vehicle);
}

// PUT /api/vehicles/:id → reemplazo completo · PATCH → parcial o reactivación (admin)
export async function updateVehicle(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  const changes = { ...req.body };
  if (changes.active === true) changes.deletedAt = null;
  if (changes.active === false) changes.deletedAt = new Date();

  const vehicle = await VehicleModel.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
  if (!vehicle) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(vehicle);
}

// DELETE /api/vehicles/:id            → baja lógica (200)
// DELETE /api/vehicles/:id?hard=true  → baja física (204)
export async function deleteVehicle(req: Request, res: Response): Promise<void> {
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
    const deleted = await VehicleModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.status(204).send();
    return;
  }

  const vehicle = await VehicleModel.findByIdAndUpdate(
    id,
    { active: false, deletedAt: new Date() },
    { new: true },
  );
  if (!vehicle) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json({ message: "Vehículo dado de baja (baja lógica)", data: vehicle });
}
