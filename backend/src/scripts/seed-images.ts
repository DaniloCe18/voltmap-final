/**
 * Sube las ilustraciones de ejemplo a los vehículos que no tienen foto.
 * Uso: npm run seed:images (requiere las variables STORAGE_* en el .env)
 */
import { connectDB, disconnectDB } from "../lib/db.js";
import { uploadSampleVehicleImages } from "./vehicle-images.js";

connectDB()
  .then(uploadSampleVehicleImages)
  .then(disconnectDB)
  .then(() => console.log("✅ Listo"))
  .catch(async (err) => {
    console.error("❌ Error subiendo imágenes:", err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
