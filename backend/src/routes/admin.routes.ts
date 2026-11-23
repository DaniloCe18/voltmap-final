import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { listSessions, revokeSession, revokeUserSessions } from "../controllers/session.controller.js";

const router = Router();

// Todo el panel de sesiones es solo para admin (401 sin sesión · 403 con rol user)
router.use(authMiddleware, requireRole("admin"));

router.get("/sessions", listSessions);
router.delete("/sessions/:id", revokeSession);
router.delete("/users/:userId/sessions", revokeUserSessions);

export default router;
