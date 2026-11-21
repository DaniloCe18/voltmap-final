import { Link } from "react-router-dom";
import { CONNECTOR_LABELS, type Station } from "../types/station";
import { formatPower, formatPrice } from "../lib/format";

const MAX_KW = 350;

export function PowerMeter({ kw }: { kw: number }) {
  const pct = Math.min(100, Math.round((kw / MAX_KW) * 100));
  return (
    <div className="power-meter" aria-label={`Potencia ${formatPower(kw)}`}>
      <div className="power-fill" style={{ width: `${Math.max(pct, 4)}%` }} />
    </div>
  );
}

export function StationCard({ station }: { station: Station }) {
  return (
    <Link to={`/stations/${station.id}`} className="card station-card">
      <div className="card-top">
        <span className={`status-dot ${station.available ? "on" : "off"}`} />
        <span className="small muted">{station.available ? "Disponible" : "Fuera de servicio"}</span>
        <span className="spacer" />
        {station.fastCharge && <span className="tag tag-accent">Carga rápida</span>}
      </div>

      <h3>{station.name}</h3>
      <p className="muted small">
        {station.city} · {station.operator}
      </p>

      <div className="card-power">
        <span className="mono power-value">{formatPower(station.powerKw)}</span>
        <span className="small muted">{CONNECTOR_LABELS[station.connectorType]}</span>
      </div>
      <PowerMeter kw={station.powerKw} />

      <div className="card-bottom">
        <span className="mono">
          {formatPrice(station.pricePerKwh)}
          <span className="muted small"> /kWh</span>
        </span>
        <span className="tags">
          {station.renewable && <span className="tag tag-green">🌱 Renovable</span>}
          {station.open24h && <span className="tag">24 h</span>}
        </span>
      </div>
    </Link>
  );
}
