import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/auth-client";
import { MiniMarkdown } from "../lib/mini-markdown";

type ToolCall = { name: string; args: Record<string, unknown> };

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  elapsedMs?: number;
}

interface ChatResponse {
  reply: string;
  toolCalls: ToolCall[];
  elapsedMs: number;
}

const TOOL_LABELS: Record<string, string> = {
  buscar_estaciones: "🔎 Buscó estaciones",
  detalle_estacion: "📄 Consultó el detalle",
  estadisticas_red: "📊 Calculó estadísticas de la red",
  estimar_carga: "⏱️ Estimó tiempo y costo",
  buscar_vehiculos: "🚗 Buscó vehículos",
  detalle_vehiculo: "📋 Consultó el auto",
  estaciones_compatibles: "🔌 Cruzó auto y estaciones",
};

const SUGGESTIONS = [
  "Tengo un BYD Dolphin, ¿dónde lo cargo en Córdoba y cuánto tardo?",
  "¿Qué auto eléctrico con más de 400 km de autonomía se vende en Argentina?",
  "Voy de Buenos Aires a Mar del Plata, ¿dónde puedo parar a cargar?",
  "¿Cuál es la estación más barata con energía renovable?",
];

const MAX_HISTORY = 20;

function describeArgs(args: Record<string, unknown>) {
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export function AssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    if (content.length > 1000) {
      setError("El mensaje no puede superar los 1000 caracteres");
      return;
    }

    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Se envía solo el texto (sin metadatos) y las últimas N entradas
      const payload = history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
      while (payload.length && payload[0].role !== "user") payload.shift();

      const res = await api<ChatResponse>("/agent/chat", {
        method: "POST",
        body: JSON.stringify({ messages: payload }),
      });
      setMessages([
        ...history,
        { role: "assistant", content: res.reply, toolCalls: res.toolCalls, elapsedMs: res.elapsedMs },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar con el asistente");
      setMessages(messages); // deshace el mensaje que falló
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <section className="container assistant">
      <div className="admin-header">
        <div>
          <p className="eyebrow mono">// agente de IA · LangChain + Gemini</p>
          <h1>Volti, tu copiloto de carga</h1>
          <p className="muted small">
            Le preguntás en lenguaje natural y el agente decide solo qué herramientas usar para consultar la
            red de VoltMap.
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={() => setMessages([])} disabled={loading}>
            Nueva conversación
          </button>
        )}
      </div>

      <div className="chat card">
        <div className="chat-log">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="big-icon">🤖</div>
              <p>
                ¡Hola{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}! Probá con alguna de estas
                preguntas:
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.role}`}>
              <div className={`bubble ${m.role}`}>
                {m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0 && (
                  <details className="tool-trace">
                    <summary>
                      {m.toolCalls.map((t, j) => (
                        <span key={j} className="tag tag-accent">
                          {TOOL_LABELS[t.name] ?? t.name}
                        </span>
                      ))}
                      {m.elapsedMs !== undefined && (
                        <span className="small muted mono"> {(m.elapsedMs / 1000).toFixed(1)} s</span>
                      )}
                    </summary>
                    <ol className="small muted mono">
                      {m.toolCalls.map((t, j) => (
                        <li key={j}>
                          {t.name}({describeArgs(t.args)})
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {m.role === "assistant" ? <MiniMarkdown text={m.content} /> : <p>{m.content}</p>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="bubble-row assistant">
              <div className="bubble assistant typing">
                <span />
                <span />
                <span />
                <em className="small muted">pensando y consultando la red…</em>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <div className="alert alert-error chat-error">{error}</div>}

        <form className="chat-input" onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntale a Volti dónde cargar…"
            maxLength={1000}
            disabled={loading}
            aria-label="Mensaje para el asistente"
          />
          <button className="btn btn-primary" disabled={loading || !input.trim()}>
            Enviar
          </button>
        </form>
      </div>
      <p className="small muted center">
        Las respuestas las genera una IA a partir de los datos de VoltMap: verificá la información antes de viajar.
      </p>
    </section>
  );
}
