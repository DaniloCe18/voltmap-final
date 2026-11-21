import { betterAuth, type BetterAuthOptions } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { authDb } from "./db.js";
import { env, isProduction } from "./env.js";

type SocialProviders = NonNullable<BetterAuthOptions["socialProviders"]>;

const socialProviders: SocialProviders = {};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

// Opcional: solo se habilita si están las credenciales
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  // El navegador habla con /api/auth a través del frontend (proxy de Vite en local,
  // rewrite de Render en producción), por eso baseURL es la URL del frontend.
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(authDb),
  trustedOrigins: [env.FRONTEND_URL, env.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders,
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  advanced: {
    useSecureCookies: isProduction,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
