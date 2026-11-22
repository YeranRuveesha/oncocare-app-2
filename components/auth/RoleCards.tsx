import Link from "next/link";
import { Building2, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_LABEL, ROLE_CARDS, type RoleCard } from "@/lib/roles";

const ICON = { patient: HeartPulse, clinician: Stethoscope, "hospital-admin": Building2, admin: ShieldCheck };

const SIGNUP_TEXT: Record<RoleCard, string> = {
  patient: "Recovering from a bone marrow transplant? Register with your hospital and doctor.",
  clinician: "Doctors register here. Your Hospital Admin checks your SLMC number before you can start.",
  "hospital-admin": "Your account is created by the platform Admin. Use the User ID and temporary password sent to you.",
  admin: "Platform Admin accounts are created by invitation only.",
};

const LOGIN_TEXT: Record<RoleCard, string> = {
  patient: "Log in with your email or telephone number.",
  clinician: "Log in with your email or telephone number.",
  "hospital-admin": "Log in with your email, telephone number or User ID.",
  admin: "Log in with your email, telephone number or User ID.",
};

/** The 4 large role cards, shared by /signup and /login. */
export default function RoleCards({ mode }: { mode: "signup" | "login" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ROLE_CARDS.map((card) => {
        const Icon = ICON[card];
        const adminOnly = card === "hospital-admin" || card === "admin";
        const signupHref = adminOnly ? "/activate" : `/signup/${card}`;
        return (
          <div key={card} className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:border-[#1B7A7E]">
            <span className="grid size-12 place-items-center rounded-xl bg-[#0F4C81]/10 text-[#0F4C81]">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">{CARD_LABEL[card]}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{mode === "signup" ? SIGNUP_TEXT[card] : LOGIN_TEXT[card]}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {mode === "login" ? (
                <Button asChild className="w-full">
                  <Link href={`/login/${card}`}>Log in as {CARD_LABEL[card]}</Link>
                </Button>
              ) : adminOnly ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={signupHref}>Activate my account</Link>
                </Button>
              ) : (
                <Button asChild variant="brand" className="w-full">
                  <Link href={signupHref}>Sign up as {CARD_LABEL[card]}</Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
