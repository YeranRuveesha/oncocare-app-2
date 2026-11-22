"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import Avatar from "@/components/shell/Avatar";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";

const MAX = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const VIEW = 256; // crop box size on screen

/**
 * Profile photo: choose → crop to a square (drag + zoom) → upload.
 * The server checks the real file type, strips EXIF/location data and resizes to 512x512.
 */
export default function PhotoUpload({
  name, url, uploadUrl = "/api/profile/photo", canEdit = true, canRemove = true,
}: {
  name: string;
  url: string | null;
  uploadUrl?: string;
  canEdit?: boolean;
  canRemove?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : 0;
  const h = img ? img.naturalHeight * scale : 0;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(VIEW - w, o.x)),
    y: Math.min(0, Math.max(VIEW - h, o.y)),
  });

  useEffect(() => {
    if (img) setOffset((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const pick = (file: File | undefined) => {
    setError(undefined);
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Please choose a PNG, JPG or WebP image.");
    if (file.size > MAX) return setError("The image is larger than 2 MB.");
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setZoom(1);
      const b = VIEW / Math.min(im.naturalWidth, im.naturalHeight);
      setOffset({ x: (VIEW - im.naturalWidth * b) / 2, y: (VIEW - im.naturalHeight * b) / 2 });
    };
    im.onerror = () => setError("That file could not be read as an image.");
    im.src = URL.createObjectURL(file);
  };

  const save = async () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const k = 512 / VIEW;
    ctx.drawImage(img, offset.x * k, offset.y * k, w * k, h * k);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return setError("Could not prepare the image.");
    if (blob.size > MAX) return setError("The cropped image is still larger than 2 MB.");
    const fd = new FormData();
    fd.append("file", blob, "avatar.png");
    setBusy(true);
    const res = await api(uploadUrl, fd);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setImg(null);
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const res = await api(uploadUrl, undefined, "DELETE");
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {img ? (
        <>
          <div
            className="relative cursor-grab touch-none overflow-hidden rounded-full border-4 border-white bg-muted shadow"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
            }}
            onPointerUp={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="Crop preview" draggable={false} className="absolute max-w-none select-none" style={{ left: offset.x, top: offset.y, width: w, height: h }} />
          </div>
          <label className="flex w-64 items-center gap-2 text-xs text-muted-foreground">
            Zoom
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brand-accent)]" />
          </label>
          <p className="text-xs text-muted-foreground">Drag to move the photo inside the circle.</p>
          <div className="flex gap-2">
            <Button type="button" variant="brand" onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Save photo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setImg(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <Avatar name={name} url={url} size={144} className="border-4 border-white shadow" />
          {canEdit && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Camera /> {url ? "Change photo" : "Upload photo"}
              </Button>
              {url && canRemove && (
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove()} disabled={busy}>
                  <Trash2 /> Remove
                </Button>
              )}
            </div>
          )}
          {!canEdit && url && canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void remove()} disabled={busy}>
              <Trash2 /> Remove photo
            </Button>
          )}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {canEdit && <p className="text-xs text-muted-foreground">PNG, JPG or WebP, max 2 MB.</p>}
        </>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
