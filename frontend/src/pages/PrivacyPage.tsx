import { Link } from "react-router-dom";

/** Política de privacidad: requerida por Google para publicar el login con Google. */
export function PrivacyPage() {
  return (
    <section className="container narrow legal">
      <p className="eyebrow mono">// legal</p>
      <h1>Política de privacidad</h1>
      <p className="muted small">Última actualización: noviembre de 2026</p>

      <p>
        VoltMap es un proyecto académico (trabajo práctico de una materia universitaria) que funciona como
        directorio de estaciones de carga para autos eléctricos. Esta página explica qué datos usamos y para qué.
      </p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, email y, si ingresás con GitHub o Google, tu foto de perfil. Si te
          registrás con email, la contraseña se guarda cifrada (hash), nunca en texto plano.
        </li>
        <li>
          <strong>Sesión:</strong> una cookie de sesión necesaria para mantenerte logueado.
        </li>
        <li>
          <strong>Contenido:</strong> las estaciones de carga que cargues, asociadas a tu usuario.
        </li>
        <li>
          <strong>Asistente de IA:</strong> los mensajes que escribís en el chat se envían a Google Gemini para
          generar la respuesta. No se guardan en nuestra base de datos.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Solo para que la aplicación funcione: identificarte, mostrar tus estaciones y permitir o restringir
        acciones según tu rol. No vendemos ni compartimos tus datos con terceros, no enviamos publicidad y no
        usamos cookies de seguimiento.
      </p>

      <h2>Login con Google y GitHub</h2>
      <p>
        Solo pedimos los permisos básicos de perfil (nombre, email y foto). No accedemos a tus archivos, correos,
        repositorios ni a ningún otro dato de esas cuentas.
      </p>

      <h2>Borrar tus datos</h2>
      <p>
        Podés eliminar las estaciones que cargaste desde "Mis estaciones". Para borrar tu cuenta por completo,
        escribile al administrador del proyecto a través del repositorio en GitHub.
      </p>

      <p>
        <Link to="/">← Volver a VoltMap</Link>
      </p>
    </section>
  );
}
