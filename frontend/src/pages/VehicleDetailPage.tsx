import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { useSession } from "../lib/auth-client";
import { isAdmin } from "../lib/permissions";
import { ConfirmModal } from "../components/ConfirmModal";
import { RangeMeter, VehicleImage } from "../components/VehicleCard";
import { Spinner } from "../components/Spinner";
import { BODY_LABELS } from "../types/vehicle";
import { CONNECTOR_LABELS } from "../types/station";
import { formatDate, formatNumber, formatPower, formatUsd } from "../lib/format";
import { useDeleteVehicleMutation, useGetStationsQuery, useGetVehicleQuery } from "../store/api";
import { errorMessage, errorStatus } from "../store/errors";
import { useAppDispatch } from "../store";
import { notify } from "../store/notificationsSlice";

export function VehicleDetailPage() {
  const { id = "" } = useParams();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: vehicle, error } = useGetVehicleQuery(id);
  // Relación entre modelos: estaciones de la red con el mismo conector que el auto
  const { data: compatible } = useGetStationsQuery(
    vehicle ? { connectorType: vehicle.connectorType, available: "true", sort: "power", limit: 6 } : skipToken,
  );
  const [deleteVehicle, { isLoading: deleting }] = useDeleteVehicleMutation();

  if (error) {
    const status = errorStatus(error);
    return (
      <section className="container empty-state">
        <div className="big-icon">{status === 404 ? "🔍" : "⚠️"}</div>
        <h1>{status === 404 ? "Vehículo no encontrado" : "Algo salió mal"}</h1>
        <p className="muted">{errorMessage(error)}</p>
        <Link to="/vehicles" className="btn btn-primary">
          Volver al catálogo
        </Link>
      </section>
    );
  }

  if (!vehicle) return <Spinner />;

  const canEdit = isAdmin(session?.user);
  // Tiempo 10 → 80 % con la potencia máxima que acepta el auto
  const chargeTime = Math.round((((vehicle.batteryKwh * 0.7) / (vehicle.maxChargeKw * 0.9)) * 60));

  async function handleSoftDelete() {
    if (!vehicle) return;
    try {
      await deleteVehicle({ id: vehicle.id, hard: false }).unwrap();
      dispatch(notify(`"${vehicle.brand} ${vehicle.model}" se dio de baja`));
      navigate("/admin/vehicles");
    } catch (e) {
      dispatch(notify(errorMessage(e), "error"));
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <section className="container detail">
      <Link to="/vehicles" className="btn btn-link">
        ← Todos los vehículos
      </Link>

      <div className="detail-header">
        <div>
          <p className="eyebrow mono">
            {vehicle.brand} · {BODY_LABELS[vehicle.bodyType]}
          </p>
          <h1>
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="muted">
            {vehicle.availableInArgentina ? "🇦🇷 Disponible en Argentina" : "No se comercializa en Argentina"} ·
            Lanzamiento {formatDate(vehicle.releaseDate)}
          </p>
        </div>
        {canEdit && (
          <div className="admin-actions">
            <Link to={`/admin/vehicles/${vehicle.id}/edit`} className="btn btn-primary">
              Editar
            </Link>
            {vehicle.active !== false && (
              <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                Dar de baja
              </button>
            )}
          </div>
        )}
      </div>

      {vehicle.active === false && (
        <div className="banner-inactive">
          Este vehículo está <strong>dado de baja</strong> y no se ve en la vista pública. Podés reactivarlo desde
          el panel.
        </div>
      )}

      <VehicleImage vehicle={vehicle} className="large" />

      <div className="detail-grid">
        <div className="card stat-big">
          <span className="muted small">Autonomía</span>
          <span className="mono stat-value">{formatNumber(vehicle.rangeKm)} km</span>
          <RangeMeter km={vehicle.rangeKm} />
          <span className="small muted">{formatNumber(vehicle.kmPerKwh)} km por kWh</span>
        </div>
        <div className="card stat-big">
          <span className="muted small">Batería</span>
          <span className="mono stat-value">{formatNumber(vehicle.batteryKwh)} kWh</span>
          <span className="small muted">Carga máxima: {formatPower(vehicle.maxChargeKw)}</span>
        </div>
        <div className="card stat-big">
          <span className="muted small">Carga rápida 10 → 80 %</span>
          <span className="mono stat-value">≈ {chargeTime} min</span>
          <span className="small muted">en un cargador de {formatPower(vehicle.maxChargeKw)} o más</span>
        </div>
        <div className="card stat-big">
          <span className="muted small">Precio de referencia</span>
          <span className="mono stat-value">{formatUsd(vehicle.priceUsd)}</span>
          <span className="small muted">{CONNECTOR_LABELS[vehicle.connectorType]}</span>
        </div>
      </div>

      <h2 className="section-title">⚡ Dónde cargarlo</h2>
      <p className="muted small">
        Estaciones disponibles de la red con conector {CONNECTOR_LABELS[vehicle.connectorType]}, de mayor a menor
        potencia.
      </p>
      {!compatible ? (
        <Spinner />
      ) : compatible.data.length === 0 ? (
        <p className="muted">Todavía no hay estaciones compatibles cargadas en la red.</p>
      ) : (
        <div className="compat-list">
          {compatible.data.map((s) => {
            // La carga real la limita el menor entre lo que da la estación y lo que acepta el auto
            const effectiveKw = Math.min(s.powerKw, vehicle.maxChargeKw);
            return (
              <Link key={s.id} to={`/stations/${s.id}`} className="card compat-item">
                <strong>{s.name}</strong>
                <span className="small muted">
                  {s.city} · {formatPower(s.powerKw)}
                </span>
                <span className="small">
                  ≈ {Math.round(((vehicle.batteryKwh * 0.7) / (effectiveKw * 0.9)) * 60)} min de 10 a 80 %
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        variant="warning"
        title="¿Dar de baja el vehículo?"
        confirmLabel="Sí, dar de baja"
        loading={deleting}
        onConfirm={handleSoftDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>
          <strong>
            {vehicle.brand} {vehicle.model}
          </strong>{" "}
          dejará de verse en la vista pública.
        </p>
        <p>Es una baja lógica: lo podés reactivar desde el panel de administración.</p>
      </ConfirmModal>
    </section>
  );
}
