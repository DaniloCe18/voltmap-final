import type { Request, Response } from "express";
import { ObjectId, type Filter, type Document } from "mongodb";
import { z } from "zod";
import { authDb } from "../lib/db.js";

/**
 * Sesiones activas (colección "session" de Better Auth en MongoDB).
 * Revocar una sesión = borrar su documento: en el siguiente request, Better Auth
 * ya no la encuentra y ese usuario queda deslogueado.
 */
const sessions = () => authDb.collection("session");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  userId: z.string().trim().optional(),
});

// Better Auth guarda los ids como ObjectId; se aceptan también como texto por las dudas
function idVariants(id: string): unknown[] {
  return ObjectId.isValid(id) ? [new ObjectId(id), id] : [id];
}

// GET /api/admin/sessions?page&limit&userId → sesiones vigentes con los datos del usuario
export async function listSessions(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros inválidos" });
    return;
  }
  const { page, limit, userId } = parsed.data;

  const match: Filter<Document> = { expiresAt: { $gt: new Date() } };
  if (userId) match.userId = { $in: idVariants(userId) };

  const [rows, total] = await Promise.all([
    sessions()
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "user",
            let: { uid: "$userId" },
            pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, { $toString: "$$uid" }] } } }],
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      ])
      .toArray(),
    sessions().countDocuments(match),
  ]);

  const currentId = req.session?.id;
  res.json({
    data: rows.map((s) => ({
      id: String(s._id),
      userId: String(s.userId),
      userName: s.user?.name ?? "(usuario eliminado)",
      userEmail: s.user?.email ?? "",
      userRole: s.user?.role ?? "user",
      ipAddress: s.ipAddress ?? "",
      userAgent: s.userAgent ?? "",
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      expiresAt: s.expiresAt,
      // La sesión del admin que está mirando el panel
      current: String(s._id) === String(currentId),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

// DELETE /api/admin/sessions/:id → revocar una sesión
export async function revokeSession(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (String(req.session?.id) === id) {
    res.status(400).json({ error: "No podés revocar tu propia sesión desde acá: usá \"Salir\"" });
    return;
  }
  const result = await sessions().deleteOne({ _id: { $in: idVariants(id) } } as Filter<Document>);
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Sesión no encontrada (puede que ya haya vencido)" });
    return;
  }
  res.status(204).send();
}

// DELETE /api/admin/users/:userId/sessions → revocar todas las sesiones de un usuario
export async function revokeUserSessions(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const filter: Filter<Document> = { userId: { $in: idVariants(userId) } };
  // Si el admin se cierra a sí mismo, se conserva la sesión actual
  if (String(req.user?.id) === userId && req.session?.id) {
    filter._id = { $nin: idVariants(String(req.session.id)) };
  }
  const result = await sessions().deleteMany(filter);
  res.json({ revoked: result.deletedCount });
}
