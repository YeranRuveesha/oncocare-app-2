"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

/** Optional hospital logo: PNG, JPG or SVG, max 2 MB (checked again on the server). */
export default function LogoPicker({ preview, onFile, onClear, error }: { preview: string | null; onFile: (f: File, url: string) => void; onClear: () => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Hospital logo <span className="font-normal text-muted-foreground">(optional)</span></span>
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo preview" className="size-16 rounded-lg border bg-white object-contain p-1" />
        ) : (
          <span className="grid size-16 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">No logo</span>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}><ImagePlus /> Choose logo</Button>
        {preview && <Button type="button" variant="ghost" size="sm" onClick={onClear}><Trash2 /> Remove</Button>}
      </div>
      <input
        ref={ref}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!TYPES.includes(f.type) || f.size > 2 * 1024 * 1024) {
            alert("Please choose a PNG, JPG or SVG file of 2 MB or less.");
            return;
          }
          onFile(f, URL.createObjectURL(f));
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">PNG, JPG or SVG, max 2 MB. A placeholder icon is used if there is no logo.</p>
      {error && <p className="text-xs font-medium text-crimson">{error}</p>}
    </div>
  );
}
