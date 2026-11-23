import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { Spinner } from "./Spinner";
import { AdminNav } from "./AdminNav";

/** Ruta protegida por rol: sin sesión → /login, sin rol admin → "sin permisos". */
export function RequireAdmin() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <Spinner label="Verificando sesión…" />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.user.role !== "admin") {
    return (
      <section className="container empty-state">
        <div className="big-icon">🔒</div>
        <h1>Sin permisos</h1>
        <p className="muted">
          Tu cuenta tiene rol <strong>{session.user.role ?? "user"}</strong>. Solo los
          administradores pueden entrar al panel.
        </p>
        <Link to="/" className="btn btn-primary">
          Volver a las estaciones
        </Link>
      </section>
    );
  }

  return (
    <>
      <AdminNav />
      <Outlet />
    </>
  );
}
