import { StationsManager } from "../components/StationsManager";

/** Registros propios: cada usuario ve, edita y elimina solo las estaciones que cargó. */
export function MyStationsPage() {
  return (
    <StationsManager
      source="mine"
      eyebrow="// tus aportes a la red"
      title="Mis estaciones"
      emptyText="Todavía no cargaste ninguna estación. ¡Sumá la primera!"
    />
  );
}
