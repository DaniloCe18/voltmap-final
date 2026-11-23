export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <span className="muted small">{label}</span>
    </div>
  );
}
