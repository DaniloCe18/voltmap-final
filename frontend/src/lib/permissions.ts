import type { Station } from "../types/station";

type SessionUser = { id: string; role?: string | null } | undefined;

export const isAdmin = (user: SessionUser) => user?.role === "admin";

/** Registros propios: el dueño o un admin pueden editar/eliminar (el backend lo vuelve a validar). */
export const canEditStation = (user: SessionUser, station: Pick<Station, "createdBy">) =>
  !!user && (isAdmin(user) || station.createdBy === user.id);
