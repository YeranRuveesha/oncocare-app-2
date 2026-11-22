import "server-only";
import { randomBytes } from "node:crypto";
import { isSafeSvg, MAX_UPLOAD_BYTES, sniffImage } from "@/lib/media";
import type { ServiceClient } from "@/lib/supabase/server";

/** Validates (by content) and stores a hospital logo. Returns the storage path. */
export async function storeLogo(db: ServiceClient, hospitalId: string, file: File): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "The logo is larger than 2 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (kind !== "png" && kind !== "jpeg" && kind !== "svg") return { ok: false, message: "Logo must be a PNG, JPG or SVG file." };
  if (kind === "svg" && !isSafeSvg(buf)) return { ok: false, message: "This SVG contains scripts and cannot be used." };
  const ext = kind === "jpeg" ? "jpg" : kind;
  const path = `${hospitalId}/logo-${randomBytes(6).toString("hex")}.${ext}`;
  const contentType = kind === "svg" ? "image/svg+xml" : `image/${kind}`;
  const { error } = await db.storage.from("hospital-logos").upload(path, buf, { contentType, upsert: false });
  if (error) return { ok: false, message: "Logo upload failed: " + error.message };
  return { ok: true, path };
}

export async function removeLogo(db: ServiceClient, path: string | null) {
  if (path) await db.storage.from("hospital-logos").remove([path]);
}
