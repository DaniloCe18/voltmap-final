import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** "danger" pinta el botón de confirmar en rojo (acciones irreversibles) */
  variant?: "danger" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Ventana modal de confirmación, previa a toda eliminación.
 * Se cierra con "Cancelar", con Esc o haciendo clic afuera.
 */
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // El foco arranca en "Cancelar": confirmar tiene que ser una decisión explícita
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => !loading && onCancel()}>
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-icon ${variant}`} aria-hidden>
          {variant === "danger" ? "🗑️" : "⚠️"}
        </div>
        <h2 id="confirm-modal-title">{title}</h2>
        <div className="modal-body muted">{children}</div>
        <div className="modal-actions">
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`btn ${variant === "danger" ? "btn-danger-solid" : "btn-warning"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
