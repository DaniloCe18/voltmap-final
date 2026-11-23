import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toDateInput } from "../../lib/format";
import type { Station } from "../../types/station";
import type { StationFormValues } from "../../schemas/station";
import { StationForm } from "../../components/StationForm";
import { Spinner } from "../../components/Spinner";

/**
 * Alta (/admin/stations/new) y edición (/admin/stations/:id/edit).
 * Ruta protegida por RequireAdmin: solo la ve un admin.
 */
export function StationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [station, setStation] = useState<Station | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Station>(`/stations/${id}`)
      .then(setStation)
      .catch((e: Error) => setError(e.message));
  }, [id]);

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
      <Link to="/admin" className="btn btn-link">
        ← Volver al panel
      </Link>
      <h1>{isEdit ? "Editar estación" : "Nueva estación"}</h1>
      {content}
    </section>
  );
}
