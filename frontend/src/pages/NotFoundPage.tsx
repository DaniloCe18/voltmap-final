import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="container empty-state">
      <div className="big-icon mono">404</div>
      <h1>Esta ruta se quedó sin batería</h1>
      <p className="muted">La página que buscás no existe.</p>
      <Link to="/" className="btn btn-primary">
        Ir al inicio
      </Link>
    </section>
  );
}
