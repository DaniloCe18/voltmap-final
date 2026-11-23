import { Link, Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Toaster } from "./components/Toaster";
import { RequireAdmin } from "./components/RequireAdmin";
import { RequireAuth } from "./components/RequireAuth";
import { HomePage } from "./pages/HomePage";
import { StationDetailPage } from "./pages/StationDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { AdminStationsPage } from "./pages/admin/AdminStationsPage";
import { StationEditorPage } from "./pages/admin/StationEditorPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VehicleDetailPage } from "./pages/VehicleDetailPage";
import { AdminVehiclesPage } from "./pages/admin/AdminVehiclesPage";
import { VehicleEditorPage } from "./pages/admin/VehicleEditorPage";
import { AdminSessionsPage } from "./pages/admin/AdminSessionsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";

function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container small muted">
          VoltMap · Trabajo práctico full stack · Express + MongoDB + Better Auth + React ·{" "}
          <Link to="/privacidad">Privacidad</Link> ·{" "}
          <a href="/api/docs" target="_blank" rel="noreferrer">
            API (Swagger)
          </a>
        </div>
      </footer>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="stations/:id" element={<StationDetailPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />

        {/* Privada: cualquier usuario logueado (sin sesión → /login) */}
        <Route element={<RequireAuth />}>
          <Route path="assistant" element={<AssistantPage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="privacidad" element={<PrivacyPage />} />

        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<AdminStationsPage />} />
          <Route path="stations/new" element={<StationEditorPage />} />
          <Route path="stations/:id/edit" element={<StationEditorPage />} />
          <Route path="vehicles" element={<AdminVehiclesPage />} />
          <Route path="vehicles/new" element={<VehicleEditorPage />} />
          <Route path="vehicles/:id/edit" element={<VehicleEditorPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="sessions" element={<AdminSessionsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
