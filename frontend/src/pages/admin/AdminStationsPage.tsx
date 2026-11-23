import { StationsManager } from "../../components/StationsManager";

/** Panel admin: ABM de TODAS las estaciones, de cualquier usuario. */
export function AdminStationsPage() {
  return (
    <StationsManager
      eyebrow="// panel de administración"
      title="Todas las estaciones"
      emptyText="No hay estaciones cargadas."
    />
  );
}
