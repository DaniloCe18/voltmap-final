import { Link, useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { toDateInput } from "../../lib/format";
import type { StationFormValues } from "../../schemas/station";
import { StationForm } from "../../components/StationForm";
import { Spinner } from "../../components/Spinner";
import {
  useCreateStationMutation,
  useGetStationQuery,
  useUpdateStationMutation,
} from "../../store/api";
import { errorMessage, toApiError } from "../../store/errors";
import { useAppDispatch } from "../../store";
import { notify } from "../../store/notificationsSlice";

/**
 * Alta (/admin/stations/new) y edición (/admin/stations/:id/edit).
 * Ruta protegida por RequireAdmin: solo la ve un admin.
 */
export function StationEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isEdit = Boolean(id);

  // En el alta no hay nada que cargar (skipToken = no hacer la consulta)
  const { data: station, error: queryError } = useGetStationQuery(id ?? skipToken);
  const [createStation] = useCreateStationMutation();
  const [updateStation] = useUpdateStationMutation();
  const error = queryError ? errorMessage(queryError) : null;

  async function handleSubmit(values: StationFormValues) {
    try {
      const saved = id
        ? await updateStation({ id, body: values }).unwrap()
        : await createStation(values).unwrap();
      dispatch(notify(isEdit ? `"${saved.name}" se actualizó` : `"${saved.name}" se creó`));
      navigate(`/stations/${saved.id}`);
    } catch (e) {
      // El formulario muestra los errores de validación del backend en cada campo
      throw toApiError(e);
    }
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
