import { Link, NavLink, useNavigate } from "react-router-dom";
import { signOut, useSession } from "../lib/auth-client";

export function Navbar() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const isAdmin = session?.user.role === "admin";

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-bolt" aria-hidden>
            ⚡
          </span>
          Volt<span>Map</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end>
            Estaciones
          </NavLink>
          {session && <NavLink to="/my-stations">Mis estaciones</NavLink>}
          <NavLink to="/assistant">🤖 Asistente IA</NavLink>
          {isAdmin && <NavLink to="/admin">Panel admin</NavLink>}
        </nav>

        <div className="nav-session">
          {isPending ? (
            <span className="muted small">…</span>
          ) : session ? (
            <>
              <div className="user-chip" title={session.user.email}>
                {session.user.image ? (
                  <img src={session.user.image} alt="" />
                ) : (
                  <span className="avatar">{session.user.name?.[0]?.toUpperCase() ?? "?"}</span>
                )}
                <span className="user-name">{session.user.name}</span>
                <span className={`role-badge ${isAdmin ? "admin" : ""}`}>
                  {session.user.role ?? "user"}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Ingresar
              </Link>
              <Link to="/register" className="btn btn-primary">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
