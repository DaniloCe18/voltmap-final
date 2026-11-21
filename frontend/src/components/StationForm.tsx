import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { stationFormSchema, type StationFormValues } from "../schemas/station";
import { CONNECTOR_LABELS, CONNECTOR_TYPES } from "../types/station";
import { ApiError } from "../lib/api";
import { chargeMinutes } from "../lib/format";

interface Props {
  defaultValues?: Partial<StationFormValues>;
  submitLabel: string;
  onSubmit: (values: StationFormValues) => Promise<void>;
}

const EMPTY: StationFormValues = {
  name: "",
  operator: "",
  city: "",
  address: "",
  connectorType: "CCS2",
  powerKw: 50,
  pricePerKwh: 350,
  renewable: false,
  open24h: false,
  available: true,
  installedAt: "",
};

export function StationForm({ defaultValues, submitLabel, onSubmit }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const power = watch("powerKw");

  async function submit(values: StationFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) {
        // Errores de validación del backend → se muestran en cada campo
        err.details.forEach((d) => {
          if (d.field in EMPTY) {
            setError(d.field as keyof StationFormValues, { message: d.message });
          }
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
        <Field label="Nombre" error={errors.name?.message}>
          <input {...register("name")} placeholder="Hub Puerto Madero" />
        </Field>
        <Field label="Operador" error={errors.operator?.message}>
          <input {...register("operator")} placeholder="EcoVolt" />
        </Field>
        <Field label="Ciudad" error={errors.city?.message}>
          <input {...register("city")} placeholder="Buenos Aires" />
        </Field>
        <Field label="Dirección" error={errors.address?.message}>
          <input {...register("address")} placeholder="Av. Siempre Viva 742" />
        </Field>
        <Field label="Tipo de conector" error={errors.connectorType?.message}>
          <select {...register("connectorType")}>
            {CONNECTOR_TYPES.map((c) => (
              <option key={c} value={c}>
                {CONNECTOR_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de instalación" error={errors.installedAt?.message}>
          <input type="date" {...register("installedAt")} />
        </Field>
        <Field
          label="Potencia (kW)"
          error={errors.powerKw?.message}
          hint={
            power > 0 ? `≈ ${chargeMinutes(power)} min para cargar 10→80 % (batería 60 kWh)` : undefined
          }
        >
          <input type="number" step="0.1" {...register("powerKw", { valueAsNumber: true })} />
        </Field>
        <Field label="Precio por kWh (ARS)" error={errors.pricePerKwh?.message}>
          <input type="number" step="1" {...register("pricePerKwh", { valueAsNumber: true })} />
        </Field>
      </div>

      <div className="checks">
        <label className="check">
          <input type="checkbox" {...register("available")} /> Disponible
        </label>
        <label className="check">
          <input type="checkbox" {...register("open24h")} /> Abierta 24 h
        </label>
        <label className="check">
          <input type="checkbox" {...register("renewable")} /> Energía 100 % renovable
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

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </label>
  );
}
