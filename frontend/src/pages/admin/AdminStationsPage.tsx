import { Link } from "react-router-dom";
import { StationsManager } from "../../components/StationsManager";

/** Panel admin: ABM de TODAS las estaciones, de cualquier usuario. */
export function AdminStationsPage() {
  return (
    <StationsManager
      eyebrow="// panel de administración"
      title="Todas las estaciones"
      emptyText="No hay estaciones cargadas."
      extraActions={
        <Link to="/admin/users" className="btn btn-ghost">
          👥 Usuarios y roles
        </Link>
      }
    />
  );
}
