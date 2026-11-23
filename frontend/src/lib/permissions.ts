type SessionUser = { id: string; role?: string | null } | undefined;

export const isAdmin = (user: SessionUser) => user?.role === "admin";
