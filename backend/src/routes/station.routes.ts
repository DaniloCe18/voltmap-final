import { Router } from "express";
import {
  createStation,
  deleteStation,
  getStation,
  listCities,
  listMyStations,
  listStations,
  updateStation,
} from "../controllers/station.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireOwnerOrAdmin } from "../middlewares/ownership.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createStationSchema,
  replaceStationSchema,
  updateStationSchema,
} from "../schemas/station.schema.js";

const router = Router();

// ─── Lectura: el listado general y el detalle son públicos ───
router.get("/", listStations);
router.get("/cities", listCities);
// "Mis estaciones" (va antes de /:id para que "mine" no se tome como id)
router.get("/mine", authMiddleware, listMyStations);
router.get("/:id", getStation);

// ─── Escritura (opcional "registros propios") ───
// Crear: cualquier usuario logueado (user o admin); la estación queda a su nombre.
router.post(
  "/",
  authMiddleware,
  requireRole("user", "admin"),
  validateBody(createStationSchema),
  createStation,
);

// Editar / eliminar: el dueño de la estación o un admin (los admin pueden con todas).
const ownerOrAdmin = [authMiddleware, requireOwnerOrAdmin];

router.put("/:id", ...ownerOrAdmin, validateBody(replaceStationSchema), updateStation);
router.patch("/:id", ...ownerOrAdmin, validateBody(updateStationSchema), updateStation);
router.delete("/:id", ...ownerOrAdmin, deleteStation);

export default router;
