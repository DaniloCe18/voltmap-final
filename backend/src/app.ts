import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { env, isProduction } from "./lib/env.js";
import stationRoutes from "./routes/station.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { isStorageConfigured } from "./lib/storage.js";
import agentRoutes from "./routes/agent.routes.js";
import { isAgentConfigured } from "./agent/agent.js";
import { swaggerDocument } from "./docs/swagger.js";
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
  res.json({
    status: "ok",
    agent: isAgentConfigured(),
    storage: isStorageConfigured(),
    time: new Date().toISOString(),
  });
});

// Documentación Swagger 2.0: interfaz en /api/docs y especificación en /api/docs.json
app.get("/api/docs.json", (_req, res) => {
  res.json(swaggerDocument);
});
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "VoltMap API · Swagger",
    swaggerOptions: { withCredentials: true, persistAuthorization: true },
  }),
);

app.use("/api/stations", stationRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/agent", agentRoutes);

app.use(notFound);
app.use(errorHandler);
