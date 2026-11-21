import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { CONNECTOR_LABELS, CONNECTOR_TYPES, type Paginated, type Station } from "../types/station";
import { StationCard } from "../components/StationCard";
import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";

const FILTER_KEYS = ["search", "city", "connectorType", "available", "renewable", "minPower", "sort"];

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<Paginated<Station> | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");

  const page = Number(params.get("page") ?? 1);
  const queryString = params.toString();

  useEffect(() => {
    api<{ data: string[] }>("/stations/cities")
      .then((r) => setCities(r.data))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams(queryString);
    if (!qs.has("limit")) qs.set("limit", "9");
    api<Paginated<Station>>(`/stations?${qs.toString()}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [queryString]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("search") ?? "") !== searchInput) updateParam("search", searchInput);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }

  function clearFilters() {
    setSearchInput("");
    setParams(new URLSearchParams());
  }

  const hasFilters = FILTER_KEYS.some((k) => params.has(k));

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow mono">// red abierta de carga eléctrica</p>
          <h1>
            Encontrá dónde <em>cargar</em> tu auto eléctrico.
          </h1>
          <p className="lead muted">
            Potencia, conector, precio por kWh y si la energía es renovable: todo lo que necesitás
            para planificar tu próximo viaje sin ansiedad de autonomía.
          </p>
          <div className="search-bar">
            <span aria-hidden>🔎</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, ciudad, operador o dirección…"
              aria-label="Buscar estaciones"
            />
          </div>
        </div>
      </section>

      <section className="container">
        <div className="filters">
          <select value={params.get("city") ?? ""} onChange={(e) => updateParam("city", e.target.value)} aria-label="Ciudad">
            <option value="">Todas las ciudades</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={params.get("connectorType") ?? ""}
            onChange={(e) => updateParam("connectorType", e.target.value)}
            aria-label="Conector"
          >
            <option value="">Todos los conectores</option>
            {CONNECTOR_TYPES.map((c) => (
              <option key={c} value={c}>
                {CONNECTOR_LABELS[c]}
              </option>
            ))}
          </select>
          <select value={params.get("minPower") ?? ""} onChange={(e) => updateParam("minPower", e.target.value)} aria-label="Potencia mínima">
            <option value="">Cualquier potencia</option>
            <option value="22">22 kW o más</option>
            <option value="50">50 kW o más (rápida)</option>
            <option value="150">150 kW o más (ultra)</option>
          </select>
          <select value={params.get("sort") ?? "newest"} onChange={(e) => updateParam("sort", e.target.value === "newest" ? "" : e.target.value)} aria-label="Ordenar">
            <option value="newest">Más recientes</option>
            <option value="power">Mayor potencia</option>
            <option value="price">Menor precio</option>
            <option value="name">Nombre A-Z</option>
          </select>
          <label className="toggle">
            <input
              type="checkbox"
              checked={params.get("available") === "true"}
              onChange={(e) => updateParam("available", e.target.checked ? "true" : "")}
            />
            Solo disponibles
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={params.get("renewable") === "true"}
              onChange={(e) => updateParam("renewable", e.target.checked ? "true" : "")}
            />
            🌱 Renovables
          </label>
          {hasFilters && (
            <button className="btn btn-link" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>

        {result && !loading && (
          <p className="muted small results-count">
            {result.total} {result.total === 1 ? "estación encontrada" : "estaciones encontradas"}
          </p>
        )}

        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : result && result.data.length > 0 ? (
          <>
            <div className="grid">
              {result.data.map((s) => (
                <StationCard key={s.id} station={s} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={result.totalPages}
              onChange={(p) => {
                const next = new URLSearchParams(params);
                next.set("page", String(p));
                setParams(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="big-icon">🔌</div>
            <h2>No hay estaciones con esos filtros</h2>
            <p className="muted">Probá ampliar la búsqueda o limpiar los filtros.</p>
          </div>
        )}
      </section>
    </>
  );
}
