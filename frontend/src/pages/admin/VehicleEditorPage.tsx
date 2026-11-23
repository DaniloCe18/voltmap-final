import { Link, useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { toDateInput } from "../../lib/format";
import type { VehicleFormValues } from "../../schemas/vehicle";
import { VehicleForm } from "../../components/VehicleForm";
import { Spinner } from "../../components/Spinner";
import {
  useCreateVehicleMutation,
  useGetVehicleQuery,
  useUpdateVehicleMutation,
} from "../../store/api";
import { errorMessage, toApiError } from "../../store/errors";
import { useAppDispatch } from "../../store";
import { notify } from "../../store/notificationsSlice";

/** Alta (/admin/vehicles/new) y edición (/admin/vehicles/:id/edit) de vehículos. Solo admin. */
export function VehicleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isEdit = Boolean(id);

  const { data: vehicle, error: queryError } = useGetVehicleQuery(id ?? skipToken);
  const [createVehicle] = useCreateVehicleMutation();
  const [updateVehicle] = useUpdateVehicleMutation();

  async function handleSubmit(values: VehicleFormValues) {
    try {
      const saved = id
        ? await updateVehicle({ id, body: values }).unwrap()
        : await createVehicle(values).unwrap();
      dispatch(notify(`"${saved.brand} ${saved.model}" ${isEdit ? "se actualizó" : "se creó"}`));
      navigate(`/vehicles/${saved.id}`);
    } catch (e) {
      throw toApiError(e);
    }
  }

  let content;
  if (queryError) {
    content = <div className="alert alert-error">{errorMessage(queryError)}</div>;
  } else if (isEdit && !vehicle) {
    content = <Spinner />;
  } else {
    content = (
      <VehicleForm
        defaultValues={
          vehicle
            ? {
                brand: vehicle.brand,
                model: vehicle.model,
                bodyType: vehicle.bodyType,
                connectorType: vehicle.connectorType,
                batteryKwh: vehicle.batteryKwh,
                rangeKm: vehicle.rangeKm,
                maxChargeKw: vehicle.maxChargeKw,
                priceUsd: vehicle.priceUsd,
                availableInArgentina: vehicle.availableInArgentina,
                releaseDate: toDateInput(vehicle.releaseDate),
                imageUrl: vehicle.imageUrl ?? "",
              }
            : undefined
        }
        submitLabel={isEdit ? "Guardar cambios" : "Crear vehículo"}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <section className="container admin narrow">
      <Link to="/admin/vehicles" className="btn btn-link">
        ← Volver a vehículos
      </Link>
      <h1>{isEdit ? "Editar vehículo" : "Nuevo vehículo"}</h1>
      {content}
    </section>
  );
}
