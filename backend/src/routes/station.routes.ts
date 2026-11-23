import { Router } from "express";
import {
  createStation,
  deleteStation,
  getStation,
  listCities,
  listStations,
  updateStation,
} from "../controllers/station.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createStationSchema,
  replaceStationSchema,
  updateStationSchema,
} from "../schemas/station.schema.js";

const router = Router();

// ─── Lectura: pública (cualquier visitante) ───
router.get("/", listStations);
router.get("/cities", listCities);
router.get("/:id", getStation);

// ─── Escritura: solo admin ───
// Sin sesión → 401 (authMiddleware) · con rol user → 403 (requireRole)
const onlyAdmin = [authMiddleware, requireRole("admin")];

router.post("/", ...onlyAdmin, validateBody(createStationSchema), createStation);
router.put("/:id", ...onlyAdmin, validateBody(replaceStationSchema), updateStation);
router.patch("/:id", ...onlyAdmin, validateBody(updateStationSchema), updateStation);
router.delete("/:id", ...onlyAdmin, deleteStation);

export default router;
