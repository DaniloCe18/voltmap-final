/**
 * Crea los usuarios de prueba (admin y común) y carga datos de ejemplo en todos los modelos.
 * Uso: npm run seed  (lee las variables SEED_* del .env)
 * Las estaciones son ficticias; las especificaciones de los vehículos son aproximadas, de referencia.
 */
import { auth } from "../lib/auth.js";
import { authDb, connectDB, disconnectDB } from "../lib/db.js";
import { StationModel } from "../models/station.model.js";
import { VehicleModel } from "../models/vehicle.model.js";
import { uploadSampleVehicleImages } from "./vehicle-images.js";

async function ensureUser(email: string, password: string, name: string, role: "admin" | "user") {
  const users = authDb.collection("user");
  const existing = await users.findOne({ email });
  if (!existing) {
    await auth.api.signUpEmail({ body: { email, password, name } });
    console.log(`👤 Usuario creado: ${email}`);
  } else {
    console.log(`👤 Usuario ya existente: ${email}`);
  }
  await users.updateOne({ email }, { $set: { role } });
  console.log(`   rol → ${role}`);
  const user = await users.findOne({ email });
  return String(user?._id ?? user?.id);
}

const sampleStations = [
  { name: "Hub Puerto Madero", operator: "EcoVolt", city: "Buenos Aires", address: "Av. Alicia Moreau de Justo 1500", connectorType: "CCS2", powerKw: 150, pricePerKwh: 420, renewable: true, open24h: true, available: true, installedAt: "2024-03-12" },
  { name: "Palermo Soho Plug", operator: "Carga Urbana", city: "Buenos Aires", address: "Gurruchaga 1800", connectorType: "Type2", powerKw: 22, pricePerKwh: 280, renewable: false, open24h: false, available: true, installedAt: "2023-08-01" },
  { name: "Parador Ruta 2 - Km 100", operator: "VíaEléctrica", city: "Chascomús", address: "RN 2 Km 100", connectorType: "CCS2", powerKw: 120, pricePerKwh: 450, renewable: false, open24h: true, available: true, installedAt: "2024-11-20" },
  { name: "Nueva Córdoba Charge", operator: "EcoVolt", city: "Córdoba", address: "Bv. Chacabuco 900", connectorType: "CCS2", powerKw: 60, pricePerKwh: 390, renewable: true, open24h: false, available: false, installedAt: "2023-05-15" },
  { name: "Cerro de las Rosas", operator: "SolarPlug", city: "Córdoba", address: "Av. Rafael Núñez 4500", connectorType: "Type2", powerKw: 11, pricePerKwh: 250, renewable: true, open24h: true, available: true, installedAt: "2022-10-03" },
  { name: "Costanera Rosario", operator: "Carga Urbana", city: "Rosario", address: "Av. Wheelwright 1600", connectorType: "CHAdeMO", powerKw: 50, pricePerKwh: 360, renewable: false, open24h: false, available: true, installedAt: "2023-02-28" },
  { name: "Mendoza Vinos & Volts", operator: "SolarPlug", city: "Mendoza", address: "Av. San Martín 2100, Luján de Cuyo", connectorType: "CCS2", powerKw: 180, pricePerKwh: 410, renewable: true, open24h: true, available: true, installedAt: "2025-01-10" },
  { name: "Bariloche Centro Cívico", operator: "Patagonia Verde", city: "Bariloche", address: "Mitre 300", connectorType: "Type2", powerKw: 22, pricePerKwh: 300, renewable: true, open24h: false, available: true, installedAt: "2024-06-18" },
  { name: "Neuquén Supercarga", operator: "VíaEléctrica", city: "Neuquén", address: "Av. Argentina 1200", connectorType: "NACS", powerKw: 250, pricePerKwh: 480, renewable: false, open24h: true, available: true, installedAt: "2025-04-02" },
  { name: "Mar del Plata Playa Grande", operator: "EcoVolt", city: "Mar del Plata", address: "Bv. Marítimo 4300", connectorType: "CCS2", powerKw: 90, pricePerKwh: 400, renewable: false, open24h: false, available: false, installedAt: "2024-01-22" },
  { name: "Salta Cerro San Bernardo", operator: "Patagonia Verde", city: "Salta", address: "Av. Hipólito Yrigoyen 50", connectorType: "GBT", powerKw: 40, pricePerKwh: 320, renewable: true, open24h: false, available: true, installedAt: "2023-12-05" },
  { name: "La Plata Diagonal 74", operator: "Carga Urbana", city: "La Plata", address: "Diagonal 74 y 8", connectorType: "Type2", powerKw: 7.4, pricePerKwh: 230, renewable: false, open24h: true, available: true, installedAt: "2022-07-14" },
];

const sampleVehicles = [
  { brand: "BYD", model: "Dolphin", bodyType: "hatchback", connectorType: "CCS2", batteryKwh: 60.4, rangeKm: 427, maxChargeKw: 88, priceUsd: 32990, availableInArgentina: true, releaseDate: "2021-08-01" },
  { brand: "BYD", model: "Yuan Plus", bodyType: "suv", connectorType: "CCS2", batteryKwh: 60.5, rangeKm: 420, maxChargeKw: 88, priceUsd: 41990, availableInArgentina: true, releaseDate: "2022-02-01" },
  { brand: "BYD", model: "Seal", bodyType: "sedan", connectorType: "CCS2", batteryKwh: 82.5, rangeKm: 570, maxChargeKw: 150, priceUsd: 49990, availableInArgentina: true, releaseDate: "2023-05-01" },
  { brand: "Renault", model: "Kwid E-Tech", bodyType: "hatchback", connectorType: "CCS2", batteryKwh: 26.8, rangeKm: 230, maxChargeKw: 30, priceUsd: 24990, availableInArgentina: true, releaseDate: "2022-09-01" },
  { brand: "Chevrolet", model: "Bolt EUV", bodyType: "suv", connectorType: "CCS2", batteryKwh: 65, rangeKm: 397, maxChargeKw: 55, priceUsd: 34990, availableInArgentina: true, releaseDate: "2021-02-14" },
  { brand: "Nissan", model: "Leaf", bodyType: "hatchback", connectorType: "CHAdeMO", batteryKwh: 40, rangeKm: 270, maxChargeKw: 50, priceUsd: 33990, availableInArgentina: true, releaseDate: "2018-01-01" },
  { brand: "Mini", model: "Cooper SE", bodyType: "hatchback", connectorType: "CCS2", batteryKwh: 32.6, rangeKm: 230, maxChargeKw: 50, priceUsd: 39990, availableInArgentina: true, releaseDate: "2020-03-01" },
  { brand: "Tesla", model: "Model 3", bodyType: "sedan", connectorType: "NACS", batteryKwh: 60, rangeKm: 513, maxChargeKw: 170, priceUsd: 42990, availableInArgentina: false, releaseDate: "2017-07-28" },
  { brand: "Volkswagen", model: "ID.4", bodyType: "suv", connectorType: "CCS2", batteryKwh: 77, rangeKm: 520, maxChargeKw: 135, priceUsd: 45000, availableInArgentina: false, releaseDate: "2020-09-01" },
  { brand: "Hyundai", model: "Ioniq 5", bodyType: "suv", connectorType: "CCS2", batteryKwh: 77.4, rangeKm: 507, maxChargeKw: 220, priceUsd: 52000, availableInArgentina: false, releaseDate: "2021-04-01" },
  { brand: "Ford", model: "F-150 Lightning", bodyType: "pickup", connectorType: "CCS2", batteryKwh: 98, rangeKm: 515, maxChargeKw: 155, priceUsd: 59990, availableInArgentina: false, releaseDate: "2022-04-26" },
  { brand: "Peugeot", model: "e-Partner", bodyType: "van", connectorType: "CCS2", batteryKwh: 50, rangeKm: 275, maxChargeKw: 100, priceUsd: 38500, availableInArgentina: true, releaseDate: "2021-06-01" },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userEmail = process.env.SEED_USER_EMAIL;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!adminEmail || !adminPassword || !userEmail || !userPassword) {
    throw new Error("Definí SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_USER_EMAIL y SEED_USER_PASSWORD en el .env");
  }

  await connectDB();

  const adminId = await ensureUser(adminEmail, adminPassword, "Admin VoltMap", "admin");
  await ensureUser(userEmail, userPassword, "Usuario VoltMap", "user");

  const count = await StationModel.countDocuments();
  if (count === 0) {
    await StationModel.insertMany(
      sampleStations.map((s) => ({
        ...s,
        installedAt: new Date(s.installedAt),
        createdBy: adminId,
        createdByName: "Admin VoltMap",
      })),
    );
    console.log(`🔌 ${sampleStations.length} estaciones de ejemplo cargadas`);
  } else {
    console.log(`🔌 Ya hay ${count} estaciones, no se cargan ejemplos`);
  }

  const vehicleCount = await VehicleModel.countDocuments();
  if (vehicleCount === 0) {
    await VehicleModel.insertMany(
      sampleVehicles.map((v) => ({
        ...v,
        releaseDate: new Date(v.releaseDate),
        createdBy: adminId,
        createdByName: "Admin VoltMap",
      })),
    );
    console.log(`🚗 ${sampleVehicles.length} vehículos de ejemplo cargados`);
  } else {
    console.log(`🚗 Ya hay ${vehicleCount} vehículos, no se cargan ejemplos`);
  }

  // Fotos de ejemplo en el almacenamiento externo (si está configurado)
  await uploadSampleVehicleImages();

  await disconnectDB();
  console.log("✅ Seed terminado");
}

main().catch(async (err) => {
  console.error("❌ Error en el seed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
