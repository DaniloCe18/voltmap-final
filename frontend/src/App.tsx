import { Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { RequireAdmin } from "./components/RequireAdmin";
import { HomePage } from "./pages/HomePage";
import { StationDetailPage } from "./pages/StationDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminStationsPage } from "./pages/admin/AdminStationsPage";
import { StationEditorPage } from "./pages/admin/StationEditorPage";
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
          VoltMap · Trabajo práctico full stack · Express + MongoDB + Better Auth + React
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="stations/:id" element={<StationDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<AdminStationsPage />} />
          <Route path="stations/new" element={<StationEditorPage />} />
          <Route path="stations/:id/edit" element={<StationEditorPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
