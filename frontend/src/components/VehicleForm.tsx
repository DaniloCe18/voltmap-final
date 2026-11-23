import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleFormSchema, type VehicleFormValues } from "../schemas/vehicle";
import { BODY_LABELS, BODY_TYPES } from "../types/vehicle";
import { CONNECTOR_LABELS, CONNECTOR_TYPES } from "../types/station";
import { ApiError } from "../lib/api";
import { Field } from "./StationForm";
import { ImageUpload } from "./ImageUpload";

interface Props {
  defaultValues?: Partial<VehicleFormValues>;
  submitLabel: string;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

const EMPTY: VehicleFormValues = {
  brand: "",
  model: "",
  bodyType: "hatchback",
  connectorType: "CCS2",
  batteryKwh: 60,
  rangeKm: 400,
  maxChargeKw: 100,
  priceUsd: 35000,
  availableInArgentina: false,
  releaseDate: "",
  imageUrl: "",
};

/** Formulario de vehículo: React Hook Form + Zod (mismas reglas que el backend) */
export function VehicleForm({ defaultValues, submitLabel, onSubmit }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const [battery, range, imageUrl] = watch(["batteryKwh", "rangeKm", "imageUrl"]);
  const efficiency = battery > 0 && range > 0 ? (range / battery).toFixed(1) : null;

  async function submit(values: VehicleFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) {
        // Errores de validación del backend → en cada campo
        err.details.forEach((d) => {
          if (d.field in EMPTY) setError(d.field as keyof VehicleFormValues, { message: d.message });
        });
        setServerError(err.message);
      } else {
        setServerError("No se pudo conectar con el servidor");
      }
    }
  }

  return (
    <form className="form card" onSubmit={handleSubmit(submit)} noValidate>
      {serverError && <div className="alert alert-error">{serverError}</div>}

      <div className="grid-2">
        <Field label="Marca" error={errors.brand?.message}>
          <input {...register("brand")} placeholder="BYD" />
        </Field>
        <Field label="Modelo" error={errors.model?.message}>
          <input {...register("model")} placeholder="Dolphin" />
        </Field>
        <Field label="Carrocería" error={errors.bodyType?.message}>
          <select {...register("bodyType")}>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {BODY_LABELS[b]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conector de carga" error={errors.connectorType?.message}>
          <select {...register("connectorType")}>
            {CONNECTOR_TYPES.map((c) => (
              <option key={c} value={c}>
                {CONNECTOR_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Batería (kWh)"
          error={errors.batteryKwh?.message}
          hint={efficiency ? `Eficiencia: ${efficiency} km por kWh` : undefined}
        >
          <input type="number" step="0.1" {...register("batteryKwh", { valueAsNumber: true })} />
        </Field>
        <Field label="Autonomía (km)" error={errors.rangeKm?.message}>
          <input type="number" step="1" {...register("rangeKm", { valueAsNumber: true })} />
        </Field>
        <Field label="Potencia máxima de carga (kW)" error={errors.maxChargeKw?.message}>
          <input type="number" step="1" {...register("maxChargeKw", { valueAsNumber: true })} />
        </Field>
        <Field label="Precio de referencia (USD)" error={errors.priceUsd?.message}>
          <input type="number" step="100" {...register("priceUsd", { valueAsNumber: true })} />
        </Field>
        <Field label="Fecha de lanzamiento" error={errors.releaseDate?.message}>
          <input type="date" {...register("releaseDate")} />
        </Field>
      </div>

      {/* La foto se sube al almacenamiento externo; el formulario guarda solo su URL */}
      <ImageUpload
        value={imageUrl}
        error={errors.imageUrl?.message}
        onChange={(url) => setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })}
      />

      <div className="checks">
        <label className="check">
          <input type="checkbox" {...register("availableInArgentina")} /> Se vende en Argentina
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
