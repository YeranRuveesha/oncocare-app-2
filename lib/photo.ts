import "server-only";
import sharp from "sharp";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/media";

/**
 * Checks and cleans an uploaded profile photo on the SERVER:
 * real type by content (PNG/JPG/WebP), max 2 MB, square crop, max 512x512,
 * EXIF/location data removed (sharp drops metadata), saved as WebP.
 */
export async function processPhoto(file: File | null): Promise<{ ok: true; data: Buffer } | { ok: false; message: string }> {
  if (!file || typeof file === "string") return { ok: false, message: "Please choose an image." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "The image is larger than 2 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (kind !== "png" && kind !== "jpeg" && kind !== "webp") return { ok: false, message: "Only PNG, JPG or WebP images are allowed." };
  try {
    const data = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate() // apply the camera's orientation before the EXIF is dropped
      .resize(512, 512, { fit: "cover", position: "centre", withoutEnlargement: false })
      .webp({ quality: 85 })
      .toBuffer();
    return { ok: true, data };
  } catch {
    return { ok: false, message: "That file could not be read as an image." };
  }
}

/** Skin-rash photo for a symptom report: real type by content, max 2 MB, EXIF/location removed, max 1280 px, saved as WebP. */
export async function processReportPhoto(file: File): Promise<{ ok: true; data: Buffer } | { ok: false; message: string }> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "The photo is larger than 2 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (kind !== "png" && kind !== "jpeg" && kind !== "webp") return { ok: false, message: "Only PNG, JPG or WebP photos are allowed." };
  try {
    const data = await sharp(buf, { limitInputPixels: 40_000_000 }).rotate().resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    return { ok: true, data };
  } catch {
    return { ok: false, message: "That file could not be read as an image." };
  }
}
