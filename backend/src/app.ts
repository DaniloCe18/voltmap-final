import express from "express";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { env, isProduction } from "./lib/env.js";
import stationRoutes from "./routes/station.routes.js";
import { errorHandler, notFound } from "./middlewares/error.js";

export const app = express();

// Render pone un proxy delante: necesario para cookies seguras e IPs reales
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(morgan(isProduction ? "tiny" : "dev"));

// Better Auth va ANTES de express.json() (lee el body por su cuenta)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/stations", stationRoutes);

app.use(notFound);
app.use(errorHandler);
