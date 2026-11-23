const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta",
  INVALID_EMAIL: "Email inválido",
  BANNED_USER: "Tu cuenta está suspendida",
};

export function translateAuthError(error: { code?: string; message?: string; status?: number }) {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return "Demasiados intentos, esperá un momento";
  return error.message ?? "Ocurrió un error, intentá de nuevo";
}
