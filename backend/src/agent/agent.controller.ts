import type { Request, Response } from "express";
import { z } from "zod";
import { getAgent, isAgentConfigured } from "./agent.js";

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z
          .string()
          .trim()
          .min(1, "El mensaje no puede estar vacío")
          .max(1000, "El mensaje no puede superar los 1000 caracteres"),
      }),
    )
    .min(1, "Enviá al menos un mensaje")
    .max(20, "La conversación es demasiado larga: empezá una nueva")
    .refine((m) => m[m.length - 1].role === "user", "El último mensaje debe ser del usuario"),
});

type ChatBody = z.infer<typeof chatSchema>;

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string" ? part : part && typeof part === "object" && "text" in part ? String(part.text) : "",
      )
      .join("");
  }
  return "";
}

// POST /api/agent/chat  (usuario logueado)
export async function chat(req: Request, res: Response): Promise<void> {
  if (!isAgentConfigured()) {
    res.status(503).json({ error: "El asistente de IA no está configurado (falta GOOGLE_API_KEY)" });
    return;
  }

  const { messages } = req.body as ChatBody;
  const started = Date.now();
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)} s`;
  console.log(`🤖 Agente: nueva pregunta → "${messages[messages.length - 1].content.slice(0, 80)}"`);

  try {
    const result = await getAgent().invoke(
      { messages: messages.map((m) => ({ role: m.role, content: m.content })) },
      {
        recursionLimit: 12,
        // Nunca esperar más de 60 s: si Gemini no responde, se corta y se avisa
        signal: AbortSignal.timeout(60_000),
        // Traza en la terminal de cada paso del agente (útil para depurar)
        callbacks: [
          {
            handleChatModelStart: () => console.log(`   🧠 [${elapsed()}] consultando a Gemini...`),
            handleLLMEnd: () => console.log(`   ✅ [${elapsed()}] Gemini respondió`),
            handleLLMError: (e: unknown) =>
              console.log(`   ❌ [${elapsed()}] error de Gemini: ${e instanceof Error ? e.message : String(e)}`),
            handleToolStart: (_tool: unknown, input: string) =>
              console.log(`   🔧 [${elapsed()}] herramienta con: ${String(input).slice(0, 120)}`),
            handleToolEnd: () => console.log(`   📦 [${elapsed()}] herramienta terminó`),
          },
        ],
      },
    );

    // Mensajes nuevos de este turno (lo que el agente "pensó" y "hizo")
    const newMessages = result.messages.slice(messages.length);

    // Herramientas que decidió usar el agente, en orden y con sus argumentos
    const toolCalls = newMessages.flatMap((m) => {
      const calls = (m as { tool_calls?: { name: string; args: Record<string, unknown> }[] }).tool_calls;
      return Array.isArray(calls) ? calls.map((c) => ({ name: c.name, args: c.args })) : [];
    });

    const last = result.messages[result.messages.length - 1];
    const reply = messageText(last?.content).trim() || "No pude generar una respuesta, probá reformular la pregunta.";

    console.log(`🤖 Agente: respuesta lista en ${elapsed()} (${toolCalls.length} herramientas)`);
    res.json({ reply, toolCalls, elapsedMs: Date.now() - started });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      console.error(`⏱️  Agente: se cortó después de ${elapsed()} sin respuesta de Gemini`);
      res.status(504).json({ error: "El asistente tardó demasiado en responder. Probá de nuevo." });
      return;
    }
    console.error("Error del agente:", err);
    res.status(502).json({ error: "El modelo de IA no respondió. Probá de nuevo en unos segundos." });
  }
}