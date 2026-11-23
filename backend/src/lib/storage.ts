import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

/**
 * Almacenamiento de imágenes en un servicio externo compatible con S3
 * (Supabase Storage, Cloudflare R2, AWS S3…). En MongoDB solo se guarda la URL.
 */
export const isStorageConfigured = () =>
  Boolean(
    env.STORAGE_ENDPOINT &&
      env.STORAGE_BUCKET &&
      env.STORAGE_ACCESS_KEY_ID &&
      env.STORAGE_SECRET_ACCESS_KEY &&
      env.STORAGE_PUBLIC_URL,
  );

let client: S3Client | null = null;
function s3() {
  if (!client) {
    client = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      forcePathStyle: true, // Supabase y R2 usan rutas del tipo /bucket/archivo
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Verifica el tipo real del archivo por sus primeros bytes ("magic numbers"),
 * para no confiar solo en el tipo que declara el navegador.
 */
export function detectImageType(buffer: Buffer): keyof typeof IMAGE_TYPES | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Sube una imagen y devuelve su URL pública */
export async function uploadImage(buffer: Buffer, contentType: string, folder = "vehicles") {
  const key = `${folder}/${randomUUID()}.${IMAGE_TYPES[contentType] ?? "bin"}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { key, url: `${env.STORAGE_PUBLIC_URL}/${key}` };
}

/**
 * Borra una imagen a partir de su URL (solo si es de nuestro bucket).
 * Es "best effort": si falla, no frena la operación principal.
 */
export async function deleteImageByUrl(url?: string | null): Promise<void> {
  if (!url || !isStorageConfigured() || !url.startsWith(`${env.STORAGE_PUBLIC_URL}/`)) return;
  const key = url.slice(env.STORAGE_PUBLIC_URL.length + 1);
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
  } catch (err) {
    console.warn(`No se pudo borrar la imagen ${key}:`, err instanceof Error ? err.message : err);
  }
}
