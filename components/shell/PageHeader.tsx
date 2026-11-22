export default function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone = "default", href }: { label: string; value: number | string; tone?: "default" | "warn" | "good"; href?: string }) {
  const color = tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-primary";
  const inner = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold ${color}`}>{value}</p>
    </>
  );
  return href ? (
    <a href={href} className="rounded-xl border bg-white p-5 shadow-sm hover:border-primary">{inner}</a>
  ) : (
    <div className="rounded-xl border bg-white p-5 shadow-sm">{inner}</div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white p-10 text-center">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
