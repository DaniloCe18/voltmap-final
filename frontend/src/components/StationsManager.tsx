import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, formatPower, formatPrice } from "../lib/format";
import type { Paginated, Station } from "../types/station";
import { Pagination } from "./Pagination";
import { Spinner } from "./Spinner";
import { ConfirmModal } from "./ConfirmModal";

type StatusFilter = "active" | "inactive" | "all";
type PendingAction = { kind: "soft" | "hard"; station: Station } | null;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Dadas de baja" },
  { value: "all", label: "Todas" },
];

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
  const [status, setStatus] = useState<StatusFilter>("active");
  const [pending, setPending] = useState<PendingAction>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "10", status });
    if (search) qs.set("search", search);
    api<Paginated<Station>>(`/stations?${qs}`)
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function afterChange(message: string) {
    setNotice(message);
    setError(null);
    if (result && result.data.length === 1 && page > 1) setPage(page - 1);
    else load();
  }

  // Confirmación del modal: baja lógica (DELETE) o física (DELETE ?hard=true)
  async function confirmPending() {
    if (!pending) return;
    const { kind, station } = pending;
    setWorking(true);
    try {
      await api(`/stations/${station.id}${kind === "hard" ? "?hard=true" : ""}`, { method: "DELETE" });
      afterChange(
        kind === "hard"
          ? `"${station.name}" se eliminó definitivamente`
          : `"${station.name}" se dio de baja: ya no se ve en la vista pública`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
      setPending(null);
    }
  }

  // Reactivar una baja lógica: PATCH { active: true }
  async function restore(station: Station) {
    try {
      await api(`/stations/${station.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
      afterChange(`"${station.name}" se reactivó y vuelve a verse en la vista pública`);
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

      <div className="status-tabs" role="tablist" aria-label="Filtrar por estado">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            className={`status-tab ${status === t.value ? "active" : ""}`}
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

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
          <p className="muted">
            {search
              ? "No hay resultados para esa búsqueda."
              : status === "inactive"
                ? "No hay estaciones dadas de baja."
                : emptyText}
          </p>
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
                  <th>Operativa</th>
                  <th>Visibilidad</th>
                  <th>Cargada por</th>
                  <th>Instalada</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.data.map((s) => {
                  const inactive = s.active === false;
                  return (
                  <tr key={s.id} className={inactive ? "row-inactive" : undefined}>
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
                      {s.available ? "Sí" : "No"}
                    </td>
                    <td>
                      {inactive ? (
                        <span className="tag tag-off" title={s.deletedAt ? `Baja: ${formatDate(s.deletedAt)}` : undefined}>
                          Dada de baja
                        </span>
                      ) : (
                        <span className="tag tag-green">Pública</span>
                      )}
                    </td>
                    <td className="small">{s.createdByName || "—"}</td>
                    <td className="small">{formatDate(s.installedAt)}</td>
                    <td className="row-actions">
                      <Link to={`/admin/stations/${s.id}/edit`} className="btn btn-ghost btn-sm">
                        Editar
                      </Link>
                      {inactive ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => restore(s)}>
                          Reactivar
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPending({ kind: "soft", station: s })}
                        >
                          Dar de baja
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setPending({ kind: "hard", station: s })}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={result.totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={pending !== null}
        variant={pending?.kind === "hard" ? "danger" : "warning"}
        title={pending?.kind === "hard" ? "¿Eliminar definitivamente?" : "¿Dar de baja la estación?"}
        confirmLabel={pending?.kind === "hard" ? "Sí, eliminar" : "Sí, dar de baja"}
        loading={working}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === "hard" ? (
          <>
            <p>
              Vas a borrar <strong>{pending?.station.name}</strong> de la base de datos.
            </p>
            <p>Esta acción es una baja física y no se puede deshacer.</p>
          </>
        ) : (
          <>
            <p>
              <strong>{pending?.station.name}</strong> dejará de verse en la vista pública.
            </p>
            <p>Es una baja lógica: queda guardada y la podés reactivar cuando quieras.</p>
          </>
        )}
      </ConfirmModal>
    </section>
  );
}
