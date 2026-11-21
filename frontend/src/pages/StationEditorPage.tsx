import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toDateInput } from "../../lib/format";
import type { Station } from "../../types/station";
import type { StationFormValues } from "../../schemas/station";
import { StationForm } from "../../components/StationForm";
import { Spinner } from "../../components/Spinner";

/** Alta (/admin/stations/new) y edición (/admin/stations/:id/edit) */
export function StationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [initial, setInitial] = useState<StationFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Station>(`/stations/${id}`)
      .then((s) =>
        setInitial({
          name: s.name,
          operator: s.operator,
          city: s.city,
          address: s.address,
          connectorType: s.connectorType,
          powerKw: s.powerKw,
          pricePerKwh: s.pricePerKwh,
          renewable: s.renewable,
          open24h: s.open24h,
          available: s.available,
          installedAt: toDateInput(s.installedAt),
        }),
      )
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function handleSubmit(values: StationFormValues) {
    const saved = await api<Station>(isEdit ? `/stations/${id}` : "/stations", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(values),
    });
    navigate(`/stations/${saved.id}`);
  }

  return (
    <section className="container admin narrow">
      <Link to="/admin" className="btn btn-link">
        ← Volver al panel
      </Link>
      <h1>{isEdit ? "Editar estación" : "Nueva estación"}</h1>

      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : isEdit && !initial ? (
        <Spinner />
      ) : (
        <StationForm
          defaultValues={initial ?? undefined}
          submitLabel={isEdit ? "Guardar cambios" : "Crear estación"}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
