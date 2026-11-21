/**
 * Diagnóstico de Gemini sin LangChain.
 * Uso: npx tsx src/scripts/test-gemini.ts
 * 1) Lista los modelos "flash" disponibles para tu clave.
 * 2) Hace una pregunta simple al modelo de GEMINI_MODEL y mide cuánto tarda.
 */
import "dotenv/config";

const key = process.env.GOOGLE_API_KEY ?? "";
const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

async function main() {
  if (!key) throw new Error("Falta GOOGLE_API_KEY en el .env");
  console.log(`Clave: ${key.slice(0, 5)}… (${key.length} caracteres) · Modelo: ${model}\n`);

  // 1) Modelos disponibles
  const list = await fetch(`${BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(20_000),
  });
  const listBody = (await list.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
    error?: { message: string };
  };
  if (!list.ok) {
    console.log(`❌ No se pudo listar modelos (${list.status}): ${listBody.error?.message}`);
  } else {
    const flash = (listBody.models ?? [])
      .filter((m) => m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));
    console.log("Modelos flash disponibles:");
    flash.forEach((m) => console.log(`  - ${m}`));
    console.log();
  }

  // 2) Pregunta de prueba
  console.log(`Preguntando a ${model}...`);
  const started = Date.now();
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Respondé solo: hola" }] }] }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message: string };
  };
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (res.ok) {
    console.log(`✅ Respondió en ${secs} s: ${body.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")}`);
  } else {
    console.log(`❌ Error ${res.status} en ${secs} s: ${body.error?.message}`);
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});