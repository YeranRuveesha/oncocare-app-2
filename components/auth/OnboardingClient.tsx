"use client";

import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import CodeStep from "./CodeStep";
import SetPassword from "./SetPassword";
import TotpSetup from "./TotpSetup";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export type StepKey = "password" | "email" | "phone" | "totp";
export interface StepInfo {
  key: StepKey;
  label: string;
  done: boolean;
}

/** Runs the verification steps in order: password → email OTP → phone OTP → authenticator. */
export default function OnboardingClient({
  steps, email, phone, isTemp,
}: {
  steps: StepInfo[];
  email: string;
  phone: string;
  isTemp: boolean;
}) {
  const router = useRouter();
  const current = steps.find((s) => !s.done);
  const refresh = () => router.refresh();

  const finish = async (data?: Record<string, unknown>) => {
    const next = (data?.next as string) || (await api<{ next: string }>("/api/onboarding/complete")).data.next;
    router.push(next || "/");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Verification steps">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
              s.done && "border-emerald-200 bg-emerald-50 text-emerald-800",
              current?.key === s.key && "border-primary bg-primary/5 text-primary",
            )}
            aria-current={current?.key === s.key ? "step" : undefined}
          >
            {s.done ? <Check className="size-4" /> : <Circle className="size-4" />}
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {current?.key === "password" && (
        <SetPassword
          url="/api/onboarding/password"
          askCurrent={isTemp}
          title="Set your own password"
          description={isTemp ? "Replace the temporary password with a new one only you know." : "Choose the password you will use to log in."}
          onDone={refresh}
        />
      )}
      {current?.key === "email" && (
        <CodeStep
          key="email"
          title="Verify your email"
          description={<>We sent a 6-digit code to <b>{email}</b>.</>}
          sendUrl="/api/onboarding/email/send"
          verifyUrl="/api/onboarding/email/verify"
          onVerified={refresh}
          help={<p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Running locally? Open Mailpit at <a className="underline" href="http://localhost:54324" target="_blank" rel="noreferrer">http://localhost:54324</a> to read the email.</p>}
        />
      )}
      {current?.key === "phone" && (
        <CodeStep
          key="phone"
          title="Verify your telephone number"
          description={<>We sent a 6-digit code by SMS to <b>{phone}</b>.</>}
          sendUrl="/api/onboarding/phone/send"
          verifyUrl="/api/onboarding/phone/verify"
          onVerified={refresh}
          help={<p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Demo: Supabase test numbers (+94 77 000 0001 to 0020) always use the code <b>123456</b>. No real SMS is sent.</p>}
        />
      )}
      {current?.key === "totp" && <TotpSetup onVerified={finish} />}
      {!current && (
        <button type="button" className="text-sm text-primary underline" onClick={() => void finish()}>
          Continue
        </button>
      )}
    </div>
  );
}
