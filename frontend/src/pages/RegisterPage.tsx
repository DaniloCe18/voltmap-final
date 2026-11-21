import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { signUp, useSession } from "../lib/auth-client";
import { registerSchema, type RegisterValues } from "../schemas/auth";
import { SocialButtons } from "../components/SocialButtons";
import { translateAuthError } from "../lib/auth-errors";

export function RegisterPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Crear cuenta</h1>
        <p className="muted">Sumate a la red y encontrá dónde cargar.</p>

        <SocialButtons />
        <div className="divider">
          <span>o con tu email</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
          {serverError && <div className="alert alert-error">{serverError}</div>}
          <label className={`field ${errors.name ? "has-error" : ""}`}>
            <span className="field-label">Nombre</span>
            <input autoComplete="name" {...register("name")} />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </label>
          <label className={`field ${errors.email ? "has-error" : ""}`}>
            <span className="field-label">Email</span>
            <input type="email" autoComplete="email" {...register("email")} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
          <label className={`field ${errors.password ? "has-error" : ""}`}>
            <span className="field-label">Contraseña</span>
            <input type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <span className="field-error">{errors.password.message}</span>
            ) : (
              <span className="field-hint">Mínimo 8 caracteres, con letras y números</span>
            )}
          </label>
          <label className={`field ${errors.confirmPassword ? "has-error" : ""}`}>
            <span className="field-label">Repetir contraseña</span>
            <input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword.message}</span>
            )}
          </label>
          <button className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="small muted center">
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </p>
      </div>
    </section>
  );
}
