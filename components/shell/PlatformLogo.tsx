import Link from "next/link";

export default function PlatformLogo({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 sm:gap-2.5" aria-label="OncoCare BMT home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/oncocare-bmt-mark.svg" alt="" className="size-8 sm:size-9" />
      <span className="leading-tight">
        <span className="block whitespace-nowrap font-display text-base font-extrabold sm:text-lg text-[#0F4C81]">
          OncoCare <span className="text-[#1B7A7E]">BMT</span>
        </span>
        {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
      </span>
    </Link>
  );
}
