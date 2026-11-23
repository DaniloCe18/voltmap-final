export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  /** true = la sesión del admin que está viendo el panel */
  current: boolean;
}

/** Resumen legible del navegador y el sistema a partir del User-Agent */
export function describeDevice(ua: string): string {
  if (!ua) return "Desconocido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Otro navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "otro sistema";
  return `${browser} en ${os}`;
}
