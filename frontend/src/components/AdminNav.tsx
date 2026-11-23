import { NavLink } from "react-router-dom";

/** Navegación entre las secciones del panel de administración */
export function AdminNav() {
  return (
    <nav className="container admin-nav" aria-label="Secciones del panel">
      <NavLink to="/admin" end>
        ⚡ Estaciones
      </NavLink>
      <NavLink to="/admin/vehicles">🚗 Vehículos</NavLink>
      <NavLink to="/admin/users">👥 Usuarios y roles</NavLink>
      <NavLink to="/admin/sessions">🔐 Sesiones</NavLink>
    </nav>
  );
}
