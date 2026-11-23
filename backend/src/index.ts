import { app } from "./app.js";
import { connectDB } from "./lib/db.js";
import { env } from "./lib/env.js";

async function main() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`⚡ VoltMap API escuchando en http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err);
  process.exit(1);
});
