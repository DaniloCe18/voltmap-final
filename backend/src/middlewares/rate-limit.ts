import type { NextFunction, Request, Response } from "express";

/**
 * Rate limit simple en memoria, por usuario logueado (o IP).
 * Protege la cuota de la API del modelo de IA. Para varias instancias habría que usar Redis.
 */
export function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id ?? req.ip ?? "anon";
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: `Demasiados mensajes. Esperá ${retryAfter} segundos.` });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
