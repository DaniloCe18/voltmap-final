import { Link } from "react-router-dom";
import { BODY_LABELS, type Vehicle } from "../types/vehicle";
import { CONNECTOR_LABELS } from "../types/station";
import { formatNumber, formatUsd } from "../lib/format";

const MAX_RANGE = 700;

export function RangeMeter({ km }: { km: number }) {
  const pct = Math.min(100, Math.round((km / MAX_RANGE) * 100));
  return (
    <div className="power-meter" aria-label={`Autonomía ${km} km`}>
      <div className="power-fill" style={{ width: `${Math.max(pct, 4)}%` }} />
    </div>
  );
}

export function VehicleImage({ vehicle, className = "" }: { vehicle: Vehicle; className?: string }) {
  return vehicle.imageUrl ? (
    <img src={vehicle.imageUrl} alt={`${vehicle.brand} ${vehicle.model}`} className={`vehicle-img ${className}`} loading="lazy" />
  ) : (
    <div className={`vehicle-img placeholder ${className}`} aria-hidden>
      🚗
    </div>
  );
}

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link to={`/vehicles/${vehicle.id}`} className="card station-card vehicle-card">
      <VehicleImage vehicle={vehicle} />
      <div className="card-top">
        <span className="small muted">{BODY_LABELS[vehicle.bodyType]}</span>
        <span className="spacer" />
        {vehicle.availableInArgentina && <span className="tag tag-green">🇦🇷 En Argentina</span>}
      </div>
      <h3>
        <span className="muted">{vehicle.brand}</span> {vehicle.model}
      </h3>
      <div className="card-power">
        <span className="mono power-value">{formatNumber(vehicle.rangeKm)} km</span>
        <span className="small muted">{formatNumber(vehicle.batteryKwh)} kWh</span>
      </div>
      <RangeMeter km={vehicle.rangeKm} />
      <div className="card-bottom">
        <span className="mono">{formatUsd(vehicle.priceUsd)}</span>
        <span className="tags">
          <span className="tag">{CONNECTOR_LABELS[vehicle.connectorType]}</span>
        </span>
      </div>
    </Link>
  );
}
