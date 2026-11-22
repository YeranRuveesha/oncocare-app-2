import "server-only";
import { config } from "@/lib/config";

type StorageClient = {
  storage: { from(bucket: string): { createSignedUrl(path: string, expires: number): Promise<{ data: { signedUrl: string } | null }> } };
};

/** Short-lived (5 minute) signed link to a PRIVATE profile photo. Null if not allowed / no photo. */
export async function signedPhotoUrl(client: StorageClient, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await client.storage.from("profile-photos").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

/** Hospital logos are public images (they are shown on login screens and menus). */
export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${config.supabaseUrl}/storage/v1/object/public/hospital-logos/${path}`;
}

/** Checks the real file type from its first bytes, not from the file name. */
export function sniffImage(buf: Buffer): "png" | "jpeg" | "webp" | "svg" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";
  return null;
}

/** SVG logos may not contain scripts or event handlers. */
export function isSafeSvg(buf: Buffer) {
  const s = buf.toString("utf8").toLowerCase();
  return !/<script|on[a-z]+\s*=|javascript:|<foreignobject|<iframe|<embed|<object/.test(s);
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
