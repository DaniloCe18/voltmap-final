import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

export type Role = "user" | "admin";

/**
 * Exige una sesión válida. Responde 401 si no hay sesión.
 * Deja el usuario y la sesión en req.user / req.session.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const result = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!result) {
    res.status(401).json({ error: "No autenticado: iniciá sesión para continuar" });
    return;
  }

  req.user = result.user;
  req.session = result.session;
  next();
}

/**
 * Sesión opcional: si hay sesión deja el usuario en req.user, si no sigue igual.
 * Se usa en rutas públicas que muestran más datos a un admin (por ejemplo, las bajas lógicas).
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (result) {
    req.user = result.user;
    req.session = result.session;
  }
  next();
}

/**
 * Exige que el usuario autenticado tenga alguno de los roles indicados.
 * Debe usarse después de authMiddleware. Responde 403 si no tiene permisos.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado: iniciá sesión para continuar" });
      return;
    }
    const userRole = (req.user.role ?? "user") as Role;
    if (!roles.includes(userRole)) {
      res.status(403).json({ error: "Sin permisos para realizar esta acción" });
      return;
    }
    next();
  };
}
