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

// Lectura: pública
router.get("/", listStations);
router.get("/cities", listCities);
router.get("/:id", getStation);

// Escritura: solo admin
const onlyAdmin = [authMiddleware, requireRole("admin")];

router.post("/", ...onlyAdmin, validateBody(createStationSchema), createStation);
router.put("/:id", ...onlyAdmin, validateBody(replaceStationSchema), updateStation);
router.patch("/:id", ...onlyAdmin, validateBody(updateStationSchema), updateStation);
router.delete("/:id", ...onlyAdmin, deleteStation);

export default router;
