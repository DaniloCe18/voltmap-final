import multer from "multer";
import { IMAGE_TYPES } from "../lib/storage.js";

export const MAX_IMAGE_MB = 3;

/**
 * Recibe un archivo "image" (multipart/form-data) en memoria.
 * Límite de tamaño y tipos permitidos; errores → 400 (ver errorHandler).
 */
export const uploadImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in IMAGE_TYPES) cb(null, true);
    else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
  },
}).single("image");
