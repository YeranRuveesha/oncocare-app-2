import { cn } from "@/lib/utils";

/** Round photo, or a circle with initials when there is no photo. */
export default function Avatar({ name, url, size = 40, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Photo of ${name}`} width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      aria-label={`${name} (no photo)`}
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials}
    </span>
  );
}
