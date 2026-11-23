import type { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { StationModel } from "../models/station.model.js";

/**
 * Registros propios: deja pasar si el usuario es admin o es el dueño de la estación.
 * - 404 si la estación no existe
 * - 403 si existe pero es de otro usuario
 * Debe usarse después de authMiddleware.
 */
export async function requireOwnerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Estación no encontrada" });
    return;
  }

  const station = await StationModel.findById(id).select("createdBy");
  if (!station) {
    res.status(404).json({ error: "Estación no encontrada" });
    return;
  }

  const isAdmin = req.user?.role === "admin";
  const isOwner = station.createdBy === req.user?.id;
  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: "Solo podés modificar las estaciones que cargaste vos" });
    return;
  }

  next();
}
