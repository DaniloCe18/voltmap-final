import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Spinner } from "../../components/Spinner";
import { Pagination } from "../../components/Pagination";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeUserSessionsMutation,
} from "../../store/api";
import { errorMessage } from "../../store/errors";
import { useAppDispatch } from "../../store";
import { notify } from "../../store/notificationsSlice";
import { describeDevice, type ActiveSession } from "../../types/session";

type Pending = { kind: "one"; session: ActiveSession } | { kind: "user"; userId: string; name: string } | null;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

/** Panel de sesiones activas: consultar y revocar (una o todas las de un usuario) */
export function AdminSessionsPage() {
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const userId = params.get("userId") ?? undefined;
  const userName = params.get("name");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Pending>(null);

  const { data, error, isFetching, refetch } = useGetSessionsQuery({ page, userId });
  const [revokeSession, { isLoading: revokingOne }] = useRevokeSessionMutation();
  const [revokeUserSessions, { isLoading: revokingAll }] = useRevokeUserSessionsMutation();

  async function confirm() {
    if (!pending) return;
    try {
      if (pending.kind === "one") {
        await revokeSession(pending.session.id).unwrap();
        dispatch(notify(`Se cerró la sesión de ${pending.session.userName}`));
      } else {
        const { revoked } = await revokeUserSessions(pending.userId).unwrap();
        dispatch(notify(`Se cerraron ${revoked} sesiones de ${pending.name}`));
      }
    } catch (e) {
      dispatch(notify(errorMessage(e), "error"));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="container admin">
      <div className="admin-header">
        <div>
          <p className="eyebrow mono">// seguridad</p>
          <h1>Sesiones activas</h1>
          <p className="muted small">
            Cada fila es un inicio de sesión vigente. Revocarla desloguea a esa persona en ese dispositivo.
          </p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching}>
            ⟳ Actualizar
          </button>
        </div>
      </div>

      {userId && (
        <div className="alert alert-success filter-banner">
          Mostrando solo las sesiones de <strong>{userName ?? "un usuario"}</strong>.{" "}
          <button className="btn btn-link" onClick={() => setParams(new URLSearchParams())}>
            Ver todas
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setPending({ kind: "user", userId, name: userName ?? "este usuario" })}
          >
            Cerrar todas sus sesiones
          </button>
        </div>
      )}

      {error ? (
        <div className="alert alert-error">{errorMessage(error)}</div>
      ) : !data ? (
        <Spinner />
      ) : data.data.length === 0 ? (
        <div className="empty-state">
          <div className="big-icon">🔐</div>
          <p className="muted">No hay sesiones activas.</p>
        </div>
      ) : (
        <>
          <p className="muted small results-count">{data.total} sesiones activas</p>
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Dispositivo</th>
                  <th>IP</th>
                  <th>Inicio</th>
                  <th>Último uso</th>
                  <th>Vence</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/admin/sessions?userId=${s.userId}&name=${encodeURIComponent(s.userName)}`}>
                        {s.userName}
                      </Link>{" "}
                      <span className={`role-badge ${s.userRole === "admin" ? "admin" : ""}`}>{s.userRole}</span>
                      {s.current && <span className="tag tag-accent"> esta sesión</span>}
                      <div className="small muted">{s.userEmail}</div>
                    </td>
                    <td className="small" title={s.userAgent}>
                      {describeDevice(s.userAgent)}
                    </td>
                    <td className="small mono">{s.ipAddress || "—"}</td>
                    <td className="small">{dateTime(s.createdAt)}</td>
                    <td className="small">{dateTime(s.updatedAt)}</td>
                    <td className="small">{dateTime(s.expiresAt)}</td>
                    <td className="row-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={s.current}
                        title={s.current ? "Para cerrar tu propia sesión usá \"Salir\"" : undefined}
                        onClick={() => setPending({ kind: "one", session: s })}
                      >
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={pending !== null}
        variant="danger"
        title={pending?.kind === "user" ? "¿Cerrar todas sus sesiones?" : "¿Revocar esta sesión?"}
        confirmLabel={pending?.kind === "user" ? "Sí, cerrar todas" : "Sí, revocar"}
        loading={revokingOne || revokingAll}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === "one" ? (
          <p>
            <strong>{pending.session.userName}</strong> va a quedar deslogueado en{" "}
            {describeDevice(pending.session.userAgent)} y tendrá que volver a iniciar sesión.
          </p>
        ) : (
          <p>
            <strong>{pending?.kind === "user" ? pending.name : ""}</strong> va a quedar deslogueado en todos sus
            dispositivos.
          </p>
        )}
      </ConfirmModal>
    </section>
  );
}
