import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { Spinner } from "./Spinner";

/** Ruta que solo exige estar logueado (cualquier rol). */
export function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <Spinner label="Verificando sesión…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
