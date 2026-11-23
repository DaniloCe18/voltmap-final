import type { Request, Response } from "express";
import { detectImageType, isStorageConfigured, uploadImage } from "../lib/storage.js";

// POST /api/uploads/image (admin) · multipart con el campo "image"
export async function uploadImageHandler(req: Request, res: Response): Promise<void> {
  if (!isStorageConfigured()) {
    res.status(503).json({ error: "El almacenamiento de imágenes no está configurado (variables STORAGE_*)" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "Enviá una imagen en el campo \"image\"" });
    return;
  }
  const realType = detectImageType(req.file.buffer);
  if (!realType) {
    res.status(400).json({ error: "El archivo no es una imagen JPG, PNG o WebP válida" });
    return;
  }
  const { url, key } = await uploadImage(req.file.buffer, realType, "vehicles");
  res.status(201).json({ url, key });
}
