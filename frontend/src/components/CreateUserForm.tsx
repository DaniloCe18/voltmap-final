import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "../lib/auth-client";
import { translateAuthError } from "../lib/auth-errors";
import { createUserSchema, type CreateUserValues } from "../schemas/auth";

/** Alta de usuarios por parte de un admin (plugin admin de Better Auth). */
export function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "user" },
  });

  async function onSubmit(values: CreateUserValues) {
    setServerError(null);
    setOk(null);
    const { error } = await authClient.admin.createUser(values);
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    setOk(`Usuario ${values.email} creado con rol ${values.role}`);
    reset({ name: "", email: "", password: "", role: "user" });
    onCreated();
  }

  return (
    <form className="form card" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Crear usuario</h2>
      {serverError && <div className="alert alert-error">{serverError}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}
      <div className="grid-2">
        <label className={`field ${errors.name ? "has-error" : ""}`}>
          <span className="field-label">Nombre</span>
          <input {...register("name")} />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </label>
        <label className={`field ${errors.email ? "has-error" : ""}`}>
          <span className="field-label">Email</span>
          <input type="email" {...register("email")} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <label className={`field ${errors.password ? "has-error" : ""}`}>
          <span className="field-label">Contraseña inicial</span>
          <input type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        <label className="field">
          <span className="field-label">Rol</span>
          <select {...register("role")}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Creando…" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
