import { Router } from "express";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listBrands,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicle.controller.js";
import { authMiddleware, optionalAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createVehicleSchema,
  replaceVehicleSchema,
  updateVehicleSchema,
} from "../schemas/vehicle.schema.js";

const router = Router();

// ─── Lectura: pública (el admin además puede ver las bajas lógicas) ───
router.get("/", optionalAuth, listVehicles);
router.get("/brands", listBrands);
router.get("/:id", optionalAuth, getVehicle);

// ─── Escritura: solo admin (401 sin sesión · 403 con rol user) ───
const onlyAdmin = [authMiddleware, requireRole("admin")];

router.post("/", ...onlyAdmin, validateBody(createVehicleSchema), createVehicle);
router.put("/:id", ...onlyAdmin, validateBody(replaceVehicleSchema), updateVehicle);
router.patch("/:id", ...onlyAdmin, validateBody(updateVehicleSchema), updateVehicle);
// Baja lógica por defecto · ?hard=true para baja física
router.delete("/:id", ...onlyAdmin, deleteVehicle);

export default router;
