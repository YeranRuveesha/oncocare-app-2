"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

/** "Pause animations": stops every looping animation on the page (WCAG 2.2.2). */
export default function MotionToggle() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("oc-motion") === "paused") setPaused(true);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "play";
    try {
      localStorage.setItem("oc-motion", paused ? "paused" : "play");
    } catch {}
  }, [paused]);
  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={paused}
      className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-ink/80 hover:bg-muted"
    >
      {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
      {paused ? "Play animations" : "Pause animations"}
    </button>
  );
}
