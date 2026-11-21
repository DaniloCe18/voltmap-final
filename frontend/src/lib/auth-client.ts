import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// Mismo origen que el frontend: /api/auth llega al backend por el proxy
// de Vite (local) o por el rewrite de Render (producción).
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [adminClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
