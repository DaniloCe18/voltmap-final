import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rate-limit.js";
import { validateBody } from "../middlewares/validate.js";
import { chat, chatSchema } from "../agent/agent.controller.js";

const router = Router();

// Solo usuarios logueados (cuida la cuota de la API de IA) · 15 mensajes cada 5 minutos
router.post(
  "/chat",
  authMiddleware,
  rateLimit({ max: 15, windowMs: 5 * 60 * 1000 }),
  validateBody(chatSchema),
  chat,
);

export default router;
