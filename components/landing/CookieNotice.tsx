"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "oncocare-cookie-ok";

/** Placeholder banner. This demo only uses cookies needed to log in; it sets no tracking cookies. */
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  return (
    <div role="region" aria-label="Cookie notice" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl flex-col gap-3 rounded-xl border bg-white p-4 shadow-lg sm:flex-row sm:items-center">
      <p className="text-xs text-slate-600">
        We only use cookies needed to keep you logged in. No tracking. <Link href="/cookies" className="font-semibold text-[#0F4C81] underline">Learn more</Link>
      </p>
      <Button size="sm" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); }}>OK</Button>
    </div>
  );
}
