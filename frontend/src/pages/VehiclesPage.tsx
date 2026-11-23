import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CONNECTOR_LABELS, CONNECTOR_TYPES } from "../types/station";
import { BODY_LABELS, BODY_TYPES } from "../types/vehicle";
import { VehicleCard } from "../components/VehicleCard";
import { Pagination } from "../components/Pagination";
import { Spinner } from "../components/Spinner";
import { useGetBrandsQuery, useGetVehiclesQuery } from "../store/api";
import { errorMessage } from "../store/errors";

const FILTER_KEYS = ["search", "brand", "bodyType", "connectorType", "minRangeKm", "availableInArgentina", "sort"];

/** Catálogo público de vehículos eléctricos (filtros sincronizados con la URL) */
export function VehiclesPage() {
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");
  const page = Number(params.get("page") ?? 1);

  const { data: brands = [] } = useGetBrandsQuery();
  const { data: result, isFetching, error } = useGetVehiclesQuery({
    page,
    limit: 9,
    search: params.get("search") ?? undefined,
    brand: params.get("brand") ?? undefined,
    bodyType: params.get("bodyType") ?? undefined,
    connectorType: params.get("connectorType") ?? undefined,
    minRangeKm: params.get("minRangeKm") ?? undefined,
    availableInArgentina: params.get("availableInArgentina") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });

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
          <p className="eyebrow mono">// catálogo de autos eléctricos</p>
          <h1>
            Elegí tu próximo <em>eléctrico</em>.
          </h1>
          <p className="lead muted">
            Autonomía, batería, potencia de carga y conector: compará modelos y mirá en qué estaciones de la red
            podés cargarlos.
          </p>
          <div className="search-bar">
            <span aria-hidden>🔎</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por marca o modelo…"
              aria-label="Buscar vehículos"
            />
          </div>
        </div>
      </section>

      <section className="container">
        <div className="filters">
          <select value={params.get("brand") ?? ""} onChange={(e) => updateParam("brand", e.target.value)} aria-label="Marca">
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select value={params.get("bodyType") ?? ""} onChange={(e) => updateParam("bodyType", e.target.value)} aria-label="Carrocería">
            <option value="">Todas las carrocerías</option>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {BODY_LABELS[b]}
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
          <select value={params.get("minRangeKm") ?? ""} onChange={(e) => updateParam("minRangeKm", e.target.value)} aria-label="Autonomía mínima">
            <option value="">Cualquier autonomía</option>
            <option value="300">300 km o más</option>
            <option value="400">400 km o más</option>
            <option value="500">500 km o más</option>
          </select>
          <select
            value={params.get("sort") ?? "newest"}
            onChange={(e) => updateParam("sort", e.target.value === "newest" ? "" : e.target.value)}
            aria-label="Ordenar"
          >
            <option value="newest">Más nuevos</option>
            <option value="range">Mayor autonomía</option>
            <option value="price">Menor precio</option>
            <option value="battery">Mayor batería</option>
            <option value="name">Marca A-Z</option>
          </select>
          <label className="toggle">
            <input
              type="checkbox"
              checked={params.get("availableInArgentina") === "true"}
              onChange={(e) => updateParam("availableInArgentina", e.target.checked ? "true" : "")}
            />
            🇦🇷 Disponibles en Argentina
          </label>
          {hasFilters && (
            <button className="btn btn-link" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>

        {result && !isFetching && (
          <p className="muted small results-count">
            {result.total} {result.total === 1 ? "vehículo encontrado" : "vehículos encontrados"}
          </p>
        )}

        {isFetching && !result ? (
          <Spinner />
        ) : error ? (
          <div className="alert alert-error">{errorMessage(error)}</div>
        ) : result && result.data.length > 0 ? (
          <>
            <div className="grid">
              {result.data.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
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
            <div className="big-icon">🚗</div>
            <h2>No hay vehículos con esos filtros</h2>
            <p className="muted">Probá ampliar la búsqueda o limpiar los filtros.</p>
          </div>
        )}
      </section>
    </>
  );
}
