import { useRef, useState } from "react";
import { useUploadImageMutation } from "../store/api";
import { errorMessage } from "../store/errors";

const MAX_MB = 3;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

/**
 * Sube una foto al almacenamiento externo (vía POST /api/uploads/image)
 * y devuelve su URL pública, que es lo único que se guarda en la base.
 */
export function ImageUpload({ value, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadImageMutation();
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    // Validación previa en el navegador (el backend vuelve a validar)
    if (!TYPES.includes(file.type)) {
      setLocalError("Elegí una imagen JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`La imagen no puede superar los ${MAX_MB} MB`);
      return;
    }
    try {
      const { url } = await upload(file).unwrap();
      onChange(url);
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shownError = localError ?? error;

  return (
    <div className={`field image-upload ${shownError ? "has-error" : ""}`}>
      <span className="field-label">Foto del vehículo</span>
      <div className="image-upload-box">
        {value ? (
          <img src={value} alt="Vista previa" className="image-upload-preview" />
        ) : (
          <div className="image-upload-preview placeholder" aria-hidden>
            🚗
          </div>
        )}
        <div className="image-upload-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? "Subiendo…" : value ? "Cambiar foto" : "📷 Subir foto"}
          </button>
          {value && !isLoading && (
            <button type="button" className="btn btn-link btn-sm" onClick={() => onChange("")}>
              Quitar
            </button>
          )}
          <span className="field-hint">JPG, PNG o WebP · máx. {MAX_MB} MB</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(",")}
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {shownError && <span className="field-error">{shownError}</span>}
    </div>
  );
}
