import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { env } from "./env.js";

// Cliente nativo que usa Better Auth para guardar usuarios, sesiones y cuentas.
// Conecta de forma perezosa en la primera operación.
export const mongoClient = new MongoClient(env.MONGODB_URI);
export const authDb = mongoClient.db();

// Mongoose para la entidad propia (estaciones).
export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  await mongoClient.connect();
  console.log(`✅ MongoDB conectado (${mongoose.connection.name})`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  await mongoClient.close();
}
