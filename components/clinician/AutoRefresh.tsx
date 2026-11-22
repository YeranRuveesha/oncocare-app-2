"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "Last updated" + Refresh. Also refreshes when the window gets focus and every 60 seconds, so new logs and reports appear without reloading. */
export default function AutoRefresh({ loadedAt }: { loadedAt: string }) {
  const router = useRouter();
  const [spin, setSpin] = useState(false);
  const refresh = () => { setSpin(true); router.refresh(); setTimeout(() => setSpin(false), 600); };
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60_000);
    const f = () => router.refresh();
    window.addEventListener("focus", f);
    return () => { clearInterval(t); window.removeEventListener("focus", f); };
  }, [router]);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground print:hidden">
      <span>Last updated {new Date(loadedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" })}</span>
      <Button size="sm" variant="outline" onClick={refresh} aria-label="Refresh"><RefreshCw className={spin ? "animate-spin" : ""} /> Refresh</Button>
      <Button size="sm" variant="outline" onClick={() => window.print()}><Printer /> Print / PDF</Button>
    </div>
  );
}
