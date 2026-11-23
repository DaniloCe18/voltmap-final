import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/auth-client";
import { isAdmin } from "../lib/permissions";
import { CONNECTOR_LABELS, type Station } from "../types/station";
import { chargeMinutes, formatDate, formatPower, formatPrice } from "../lib/format";
import { PowerMeter } from "../components/StationCard";
import { Spinner } from "../components/Spinner";

export function StationDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    api<Station>(`/stations/${id}`)
      .then(setStation)
      .catch((e) =>
        setError({ status: e instanceof ApiError ? e.status : 0, message: e.message }),
      );
  }, [id]);

  if (error) {
    return (
      <section className="container empty-state">
        <div className="big-icon">{error.status === 404 ? "🔍" : "⚠️"}</div>
        <h1>{error.status === 404 ? "Estación no encontrada" : "Algo salió mal"}</h1>
        <p className="muted">{error.message}</p>
        <Link to="/" className="btn btn-primary">
          Volver al listado
        </Link>
      </section>
    );
  }

  if (!station) return <Spinner />;

  const canEdit = isAdmin(session?.user);

  async function handleDelete() {
    if (!station || !window.confirm(`¿Eliminar "${station.name}"?`)) return;
    try {
      await api(`/stations/${station.id}`, { method: "DELETE" });
      navigate("/admin");
    } catch (e) {
      window.alert((e as Error).message);
    }
  }
  const fullCost = station.pricePerKwh * 42; // 10→80 % de 60 kWh
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${station.address}, ${station.city}, Argentina`,
  )}`;

  return (
    <section className="container detail">
      <Link to="/" className="btn btn-link">
        ← Todas las estaciones
      </Link>

      <div className="detail-header">
        <div>
          <p className="eyebrow mono">{station.operator}</p>
          <h1>{station.name}</h1>
          <p className="muted">
            📍 {station.address}, {station.city} ·{" "}
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Ver en el mapa
            </a>
          </p>
        </div>
        {canEdit && (
          <div className="admin-actions">
            <Link to={`/admin/stations/${station.id}/edit`} className="btn btn-primary">
              Editar
            </Link>
            <button className="btn btn-danger" onClick={handleDelete}>
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div className="card stat-big">
          <span className="muted small">Potencia máxima</span>
          <span className="mono stat-value">{formatPower(station.powerKw)}</span>
          <PowerMeter kw={station.powerKw} />
          <span className="small muted">
            {station.fastCharge ? "⚡ Carga rápida (DC)" : "Carga lenta / semi-rápida (AC)"}
          </span>
        </div>
        <div className="card stat-big">
          <span className="muted small">Tiempo estimado 10 → 80 %</span>
          <span className="mono stat-value">≈ {chargeMinutes(station.powerKw)} min</span>
          <span className="small muted">Batería de referencia: 60 kWh</span>
        </div>
        <div className="card stat-big">
          <span className="muted small">Precio</span>
          <span className="mono stat-value">{formatPrice(station.pricePerKwh)}</span>
          <span className="small muted">por kWh · ≈ {formatPrice(fullCost)} la carga 10 → 80 %</span>
        </div>
      </div>

      <dl className="card spec-list">
        <div>
          <dt>Conector</dt>
          <dd>{CONNECTOR_LABELS[station.connectorType]}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`status-dot ${station.available ? "on" : "off"}`} />{" "}
            {station.available ? "Disponible" : "Fuera de servicio"}
          </dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{station.open24h ? "Abierta 24 h" : "Horario comercial"}</dd>
        </div>
        <div>
          <dt>Energía</dt>
          <dd>{station.renewable ? "🌱 100 % renovable" : "Red eléctrica convencional"}</dd>
        </div>
        <div>
          <dt>Instalada</dt>
          <dd>{formatDate(station.installedAt)}</dd>
        </div>
        <div>
          <dt>Cargada por</dt>
          <dd>
            {station.createdByName || "—"}
            {session?.user.id === station.createdBy && <span className="tag"> vos</span>}
          </dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd>{formatDate(station.updatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
