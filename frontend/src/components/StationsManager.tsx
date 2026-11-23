import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, formatPower, formatPrice } from "../lib/format";
import type { Paginated, Station } from "../types/station";
import { Pagination } from "./Pagination";
import { Spinner } from "./Spinner";

interface Props {
  eyebrow: string;
  title: string;
  extraActions?: ReactNode;
  emptyText: string;
}

/** Tabla ABM de estaciones del panel admin. */
export function StationsManager({ eyebrow, title, extraActions, emptyText }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<Paginated<Station> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) qs.set("search", search);
    api<Paginated<Station>>(`/stations?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(station: Station) {
    if (!window.confirm(`¿Eliminar "${station.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/stations/${station.id}`, { method: "DELETE" });
      setNotice(`"${station.name}" eliminada`);
      if (result && result.data.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="container admin">
      <div className="admin-header">
        <div>
          <p className="eyebrow mono">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="admin-actions">
          {extraActions}
          <Link to="/admin/stations/new" className="btn btn-primary">
            + Nueva estación
          </Link>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <input
        className="admin-search"
        placeholder="Filtrar por nombre, ciudad u operador…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {!result ? (
        <Spinner />
      ) : result.data.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">🔌</div>
          <p className="muted">{search ? "No hay resultados para esa búsqueda." : emptyText}</p>
        </div>
      ) : (
        <>
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Conector</th>
                  <th className="num">Potencia</th>
                  <th className="num">$/kWh</th>
                  <th>Estado</th>
                  <th>Cargada por</th>
                  <th>Instalada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/stations/${s.id}`}>{s.name}</Link>
                      <div className="small muted">{s.operator}</div>
                    </td>
                    <td>{s.city}</td>
                    <td>{s.connectorType}</td>
                    <td className="num mono">{formatPower(s.powerKw)}</td>
                    <td className="num mono">{formatPrice(s.pricePerKwh)}</td>
                    <td>
                      <span className={`status-dot ${s.available ? "on" : "off"}`} />{" "}
                      {s.available ? "Activa" : "Inactiva"}
                    </td>
                    <td className="small">{s.createdByName || "—"}</td>
                    <td className="small">{formatDate(s.installedAt)}</td>
                    <td className="row-actions">
                      <Link to={`/admin/stations/${s.id}/edit`} className="btn btn-ghost btn-sm">
                        Editar
                      </Link>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}
