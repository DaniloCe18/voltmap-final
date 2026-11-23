import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { ApiError, type FieldError } from "../lib/api";

type RtkError = FetchBaseQueryError | SerializedError | undefined;

/** Convierte un error de RTK Query en el ApiError que ya usan los formularios */
export function toApiError(err: unknown): ApiError {
  const e = err as RtkError;
  if (e && "status" in e) {
    const status = typeof e.status === "number" ? e.status : 0;
    const data = (e.data ?? {}) as { error?: string; details?: FieldError[] };
    const fallback = status === 0 ? "No se pudo conectar con el servidor" : `Error ${status}`;
    return new ApiError(status, data.error ?? fallback, data.details ?? []);
  }
  return new ApiError(0, (e as SerializedError | undefined)?.message ?? "Error inesperado");
}

export const errorMessage = (err: unknown) => toApiError(err).message;
export const errorStatus = (err: unknown) => toApiError(err).status;
