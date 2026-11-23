import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, formatNumber, formatUsd } from "../lib/format";
import { BODY_LABELS, type Vehicle } from "../types/vehicle";
import { Pagination } from "./Pagination";
import { Spinner } from "./Spinner";
import { ConfirmModal } from "./ConfirmModal";
import {
  useDeleteVehicleMutation,
  useGetVehiclesQuery,
  useRestoreVehicleMutation,
} from "../store/api";
import { errorMessage } from "../store/errors";
import { useAppDispatch } from "../store";
import { notify } from "../store/notificationsSlice";

type StatusFilter = "active" | "inactive" | "all";
type PendingAction = { kind: "soft" | "hard"; vehicle: Vehicle } | null;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Dados de baja" },
  { value: "all", label: "Todos" },
];

const label = (v: Vehicle) => `${v.brand} ${v.model}`;

/** Tabla ABM de vehículos del panel admin (RTK Query + bajas lógica y física con modal) */
export function VehiclesManager() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: result, error: queryError } = useGetVehiclesQuery({
    page,
    limit: 10,
    search: debouncedSearch,
    status,
  });
  const [deleteVehicle, { isLoading: working }] = useDeleteVehicleMutation();
  const [restoreVehicle] = useRestoreVehicleMutation();
  const error = queryError ? errorMessage(queryError) : null;

  function afterRemove() {
    if (result && result.data.length === 1 && page > 1) setPage(page - 1);
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, vehicle } = pending;
    try {
      await deleteVehicle({ id: vehicle.id, hard: kind === "hard" }).unwrap();
      dispatch(
        notify(
          kind === "hard"
            ? `"${label(vehicle)}" se eliminó definitivamente`
            : `"${label(vehicle)}" se dio de baja: ya no se ve en el catálogo`,
        ),
      );
      if (kind === "hard" || status === "active") afterRemove();
    } catch (e) {
      dispatch(notify(errorMessage(e), "error"));
    } finally {
      setPending(null);
    }
  }

  async function restore(vehicle: Vehicle) {
    try {
      await restoreVehicle(vehicle.id).unwrap();
      dispatch(notify(`"${label(vehicle)}" se reactivó y vuelve al catálogo`));
      if (status === "inactive") afterRemove();
    } catch (e) {
      dispatch(notify(errorMessage(e), "error"));
    }
  }

  return (
    <section className="container admin">
      <div className="admin-header">
        <div>
          <p className="eyebrow mono">// panel de administración</p>
          <h1>Vehículos</h1>
        </div>
        <div className="admin-actions">
          <Link to="/admin/vehicles/new" className="btn btn-primary">
            + Nuevo vehículo
          </Link>
        </div>
      </div>

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
        placeholder="Filtrar por marca o modelo…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {!result ? (
        !error && <Spinner />
      ) : result.data.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">🚗</div>
          <p className="muted">
            {search
              ? "No hay resultados para esa búsqueda."
              : status === "inactive"
                ? "No hay vehículos dados de baja."
                : "No hay vehículos cargados."}
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Carrocería</th>
                  <th>Conector</th>
                  <th className="num">Autonomía</th>
                  <th className="num">Batería</th>
                  <th className="num">Precio</th>
                  <th>Visibilidad</th>
                  <th>Lanzamiento</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.data.map((v) => {
                  const inactive = v.active === false;
                  return (
                    <tr key={v.id} className={inactive ? "row-inactive" : undefined}>
                      <td>
                        {v.imageUrl && <img src={v.imageUrl} alt="" className="table-thumb" />}
                        <Link to={`/vehicles/${v.id}`}>{label(v)}</Link>
                        <div className="small muted">{v.availableInArgentina ? "🇦🇷 En Argentina" : "Importado"}</div>
                      </td>
                      <td>{BODY_LABELS[v.bodyType]}</td>
                      <td>{v.connectorType}</td>
                      <td className="num mono">{formatNumber(v.rangeKm)} km</td>
                      <td className="num mono">{formatNumber(v.batteryKwh)} kWh</td>
                      <td className="num mono">{formatUsd(v.priceUsd)}</td>
                      <td>
                        {inactive ? (
                          <span className="tag tag-off">Dado de baja</span>
                        ) : (
                          <span className="tag tag-green">Público</span>
                        )}
                      </td>
                      <td className="small">{formatDate(v.releaseDate)}</td>
                      <td className="row-actions">
                        <Link to={`/admin/vehicles/${v.id}/edit`} className="btn btn-ghost btn-sm">
                          Editar
                        </Link>
                        {inactive ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => restore(v)}>
                            Reactivar
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPending({ kind: "soft", vehicle: v })}
                          >
                            Dar de baja
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setPending({ kind: "hard", vehicle: v })}
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
        title={pending?.kind === "hard" ? "¿Eliminar definitivamente?" : "¿Dar de baja el vehículo?"}
        confirmLabel={pending?.kind === "hard" ? "Sí, eliminar" : "Sí, dar de baja"}
        loading={working}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === "hard" ? (
          <>
            <p>
              Vas a borrar <strong>{pending && label(pending.vehicle)}</strong> de la base de datos.
            </p>
            <p>Esta acción es una baja física y no se puede deshacer.</p>
          </>
        ) : (
          <>
            <p>
              <strong>{pending && label(pending.vehicle)}</strong> dejará de verse en el catálogo público.
            </p>
            <p>Es una baja lógica: queda guardado y lo podés reactivar cuando quieras.</p>
          </>
        )}
      </ConfirmModal>
    </section>
  );
}
