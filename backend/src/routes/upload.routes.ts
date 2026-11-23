import { Router } from "express";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { uploadImageMiddleware } from "../middlewares/upload.js";
import { uploadImageHandler } from "../controllers/upload.controller.js";

const router = Router();

// Solo admin puede subir imágenes (401 sin sesión · 403 con rol user)
router.post("/image", authMiddleware, requireRole("admin"), uploadImageMiddleware, uploadImageHandler);

export default router;
