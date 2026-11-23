import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { toDateInput } from "../lib/format";
import { useSession } from "../lib/auth-client";
import { canEditStation, isAdmin } from "../lib/permissions";
import type { Station } from "../types/station";
import type { StationFormValues } from "../schemas/station";
import { StationForm } from "../components/StationForm";
import { Spinner } from "../components/Spinner";

/**
 * Alta (/stations/new) y edición (/stations/:id/edit).
 * Cualquier usuario logueado puede crear; editar solo el dueño o un admin.
 */
export function StationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const isEdit = Boolean(id);
  const [station, setStation] = useState<Station | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Station>(`/stations/${id}`)
      .then(setStation)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const backTo = isAdmin(session?.user) ? "/admin" : "/my-stations";

  async function handleSubmit(values: StationFormValues) {
    const saved = await api<Station>(isEdit ? `/stations/${id}` : "/stations", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(values),
    });
    navigate(`/stations/${saved.id}`);
  }

  let content;
  if (error) {
    content = <div className="alert alert-error">{error}</div>;
  } else if (isEdit && !station) {
    content = <Spinner />;
  } else if (isEdit && station && !canEditStation(session?.user, station)) {
    content = (
      <div className="empty-state">
        <div className="big-icon">🔒</div>
        <h2>Sin permisos</h2>
        <p className="muted">Solo podés editar las estaciones que cargaste vos.</p>
      </div>
    );
  } else {
    content = (
      <StationForm
        defaultValues={
          station
            ? {
                name: station.name,
                operator: station.operator,
                city: station.city,
                address: station.address,
                connectorType: station.connectorType,
                powerKw: station.powerKw,
                pricePerKwh: station.pricePerKwh,
                renewable: station.renewable,
                open24h: station.open24h,
                available: station.available,
                installedAt: toDateInput(station.installedAt),
              }
            : undefined
        }
        submitLabel={isEdit ? "Guardar cambios" : "Crear estación"}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <section className="container admin narrow">
      <Link to={backTo} className="btn btn-link">
        ← Volver
      </Link>
      <h1>{isEdit ? "Editar estación" : "Nueva estación"}</h1>
      {!isEdit && (
        <p className="muted small">La estación va a quedar a tu nombre: solo vos (y los admins) van a poder editarla.</p>
      )}
      {content}
    </section>
  );
}
