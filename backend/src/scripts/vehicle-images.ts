import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { VehicleModel } from "../models/vehicle.model.js";
import { isStorageConfigured, uploadImage } from "../lib/storage.js";

// Ilustraciones de ejemplo incluidas en el repo (backend/seed-assets/vehicles/<marca>-<modelo>.jpg)
const ASSETS_DIR = path.resolve(process.cwd(), "seed-assets", "vehicles");

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Sube al almacenamiento externo la ilustración de cada vehículo que todavía no tiene foto
 * y guarda la URL en MongoDB. Devuelve cuántas imágenes subió.
 */
export async function uploadSampleVehicleImages(): Promise<number> {
  if (!isStorageConfigured()) {
    console.log("🖼️  Almacenamiento no configurado (STORAGE_*): se omiten las imágenes de ejemplo");
    return 0;
  }
  const vehicles = await VehicleModel.find({ $or: [{ imageUrl: "" }, { imageUrl: { $exists: false } }] });
  let uploaded = 0;
  for (const v of vehicles) {
    const file = path.join(ASSETS_DIR, `${slug(`${v.brand} ${v.model}`)}.jpg`);
    if (!existsSync(file)) continue;
    const { url } = await uploadImage(await readFile(file), "image/jpeg", "vehicles");
    v.imageUrl = url;
    await v.save();
    uploaded++;
    console.log(`   🖼️  ${v.brand} ${v.model} → ${url}`);
  }
  console.log(`🖼️  ${uploaded} imágenes de ejemplo subidas al almacenamiento`);
  return uploaded;
}
