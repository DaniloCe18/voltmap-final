import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient, useSession } from "../../lib/auth-client";
import { formatDate } from "../../lib/format";
import { Spinner } from "../../components/Spinner";
import { CreateUserForm } from "../../components/CreateUserForm";

type Role = "user" | "admin";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
  createdAt: Date | string;
}

/** Gestión de usuarios: alta (admin.createUser) y cambio de rol (admin.setRole) */
export function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await authClient.admin.listUsers({
      query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
    });
    if (error) setError(error.message ?? "No se pudieron cargar los usuarios");
    else setUsers(data.users as AdminUser[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(user: AdminUser, role: Role) {
    setSavingId(user.id);
    setError(null);
    const { error } = await authClient.admin.setRole({ userId: user.id, role });
    setSavingId(null);
    if (error) {
      setError(error.message ?? "No se pudo cambiar el rol");
      return;
    }
    setUsers((prev) => prev?.map((u) => (u.id === user.id ? { ...u, role } : u)) ?? null);
  }

  return (
    <section className="container admin">
      <Link to="/admin" className="btn btn-link">
        ← Volver al panel
      </Link>
      <div className="admin-header">
        <div>
          <p className="eyebrow mono">// gestión de accesos</p>
          <h1>Usuarios y roles</h1>
        </div>
      </div>

      <CreateUserForm onCreated={load} />

      {error && <div className="alert alert-error">{error}</div>}

      {!users ? (
        <Spinner />
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Registrado</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === session?.user.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name} {isMe && <span className="tag">vos</span>}
                    </td>
                    <td className="small">{u.email}</td>
                    <td className="small">{formatDate(new Date(u.createdAt).toISOString())}</td>
                    <td>
                      <select
                        value={(u.role as Role) ?? "user"}
                        disabled={isMe || savingId === u.id}
                        title={isMe ? "No podés cambiar tu propio rol" : undefined}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
