import Link from "next/link";
import DemoNotice from "./DemoNotice";
import PlatformLogo from "./PlatformLogo";

/** Simple centred layout for sign-up, login, activation and verification pages. */
export default function AuthLayout({
  title, subtitle, children, wide, back,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  back?: { href: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-ice">
      <DemoNotice />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <PlatformLogo />
        {back && (
          <Link href={back.href} className="text-sm font-medium text-primary hover:underline">
            ← {back.label}
          </Link>
        )}
      </header>
      <main className={`mx-auto px-4 pb-16 ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
