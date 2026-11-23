import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../lib/env.js";
import { agentTools } from "./tools.js";

const SYSTEM_PROMPT = `Sos "Volti", el asistente de VoltMap, una red de estaciones de carga para autos eléctricos en Argentina.
Actuás en nombre del usuario para ayudarlo a planificar dónde y cómo cargar su auto.

Reglas:
- Respondé siempre en español rioplatense, claro y breve (máximo ~150 palabras salvo que pidan más).
- NUNCA inventes estaciones, precios ni datos: consultá la base usando las herramientas.
- Para cálculos de tiempo o costo de carga usá la herramienta estimar_carga.
- Si el usuario no da datos importantes (ciudad, conector), buscá igual con lo que tengas y sugerí cómo afinar.
- Sé proactivo: si no hay resultados, probá aflojar un filtro (por ejemplo, sin "solo disponibles") y avisá que lo hiciste.
- Cuando nombres una estación, enlazala con formato markdown usando su url: [Nombre](/stations/<id>).
- Podés usar **negrita** y listas con "- ". No uses tablas ni encabezados.
- Si te preguntan algo que no tiene que ver con autos eléctricos o VoltMap, explicá amablemente que solo podés ayudar con eso.`;

let agent: ReturnType<typeof buildAgent> | null = null;

function buildAgent() {
  const model = new ChatGoogleGenerativeAI({
    model: env.GEMINI_MODEL,
    apiKey: env.GOOGLE_API_KEY,
    temperature: 0.2,
    maxRetries: 1,
  });

  return createAgent({
    model,
    tools: agentTools,
    systemPrompt: SYSTEM_PROMPT,
  });
}

export const isAgentConfigured = () => Boolean(env.GOOGLE_API_KEY);

/** Instancia única (se crea la primera vez que se usa). */
export function getAgent() {
  if (!agent) agent = buildAgent();
  return agent;
}
