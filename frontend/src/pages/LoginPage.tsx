import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { signIn, useSession } from "../lib/auth-client";
import { loginSchema, type LoginValues } from "../schemas/auth";
import { SocialButtons } from "../components/SocialButtons";
import { translateAuthError } from "../lib/auth-errors";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("error") ? "No se pudo iniciar sesión con el proveedor externo" : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setServerError(translateAuthError(error));
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Ingresar</h1>
        <p className="muted">Bienvenido de nuevo a VoltMap.</p>

        <SocialButtons redirectTo={from} />
        <div className="divider">
          <span>o con tu email</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
          {serverError && <div className="alert alert-error">{serverError}</div>}
          <label className={`field ${errors.email ? "has-error" : ""}`}>
            <span className="field-label">Email</span>
            <input type="email" autoComplete="email" {...register("email")} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
          <label className={`field ${errors.password ? "has-error" : ""}`}>
            <span className="field-label">Contraseña</span>
            <input type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </label>
          <button className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="small muted center">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </p>
      </div>
    </section>
  );
}
