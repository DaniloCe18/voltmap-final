import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Express 5 captura los errores de los handlers async y los manda acá
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: "Datos inválidos",
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
