"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

/** Search box that updates the URL after the person stops typing (400 ms). Works without JavaScript too (form submit). */
export default function TableSearch({ name, defaultValue, placeholder }: { name: string; defaultValue: string; placeholder: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(defaultValue);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      if (v.trim()) p.set(name, v.trim()); else p.delete(name);
      p.delete(name.replace(/q$/, "page"));
      router.replace(`${path}${p.toString() ? `?${p}` : ""}`);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return <Input name={name} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label="Search" autoComplete="off" />;
}
