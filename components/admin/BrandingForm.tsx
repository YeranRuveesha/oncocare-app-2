"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import BrandPreview from "./BrandPreview";
import ColorField from "./ColorField";
import LogoPicker from "./LogoPicker";

/** Hospital Admin: logo + colours (applied straight away, audit-logged). */
export default function BrandingForm({ name, logo, primary, secondary }: { name: string; logo: string | null; primary: string; secondary: string }) {
  const router = useRouter();
  const [p, setP] = useState(primary);
  const [s, setS] = useState(secondary);
  const [preview, setPreview] = useState<string | null>(logo);
  const [file, setFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string }>();

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <form
        className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.append("primary_color", p);
          fd.append("secondary_color", s);
          if (file) fd.append("logo", file);
          if (removeLogo) fd.append("remove_logo", "1");
          setBusy(true);
          const res = await api("/api/hospital/branding", fd);
          setBusy(false);
          setMsg(res.ok ? { kind: "success", text: "Branding saved." } : { kind: "error", text: res.error ?? "Failed" });
          if (res.ok) router.refresh();
        }}
      >
        <LogoPicker
          preview={preview}
          onFile={(f, url) => {
            setFile(f);
            setPreview(url);
            setRemoveLogo(false);
          }}
          onClear={() => {
            setFile(null);
            setPreview(null);
            setRemoveLogo(true);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="primary_color" label="Primary colour" value={p} onChange={setP} />
          <ColorField id="secondary_color" label="Secondary colour" value={s} onChange={setS} />
        </div>
        {msg && <FormAlert kind={msg.kind}>{msg.text}</FormAlert>}
        <div>
          <Button type="submit" variant="brand" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save branding</Button>
        </div>
      </form>
      <BrandPreview name={name} logo={preview} primary={p} secondary={s} />
    </div>
  );
}
