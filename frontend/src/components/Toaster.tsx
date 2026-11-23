import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { dismiss, type Notification } from "../store/notificationsSlice";

function Toast({ n }: { n: Notification }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(dismiss(n.id)), 4500);
    return () => clearTimeout(t);
  }, [dispatch, n.id]);

  return (
    <div className={`toast toast-${n.kind}`} role="status">
      <span>{n.kind === "success" ? "✓" : "⚠"}</span>
      <span className="toast-msg">{n.message}</span>
      <button className="toast-close" aria-label="Cerrar" onClick={() => dispatch(dismiss(n.id))}>
        ×
      </button>
    </div>
  );
}

/** Muestra las notificaciones del estado global (slice "notifications") */
export function Toaster() {
  const notifications = useAppSelector((s) => s.notifications);
  return (
    <div className="toaster" aria-live="polite">
      {notifications.map((n) => (
        <Toast key={n.id} n={n} />
      ))}
    </div>
  );
}
