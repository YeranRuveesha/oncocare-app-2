import { redirect } from "next/navigation";
import OnboardingClient, { type StepInfo } from "@/components/auth/OnboardingClient";
import AuthLayout from "@/components/shell/AuthLayout";
import { getSessionState, nextPath } from "@/lib/session";

function mask(phone: string) {
  return phone.length > 6 ? `${phone.slice(0, 4)} ••• ${phone.slice(-4)}` : phone;
}

export default async function OnboardingPage() {
  const s = await getSessionState();
  if (!s) redirect("/login");
  if (s.gate !== "onboarding" || !s.profile) redirect(nextPath(s));
  const p = s.profile;
  const steps: StepInfo[] = [];
  if (p.must_change_password || p.temp_password_used_at || p.created_by) {
    steps.push({ key: "password", label: "Set password", done: !p.must_change_password });
  }
  steps.push(
    { key: "email", label: "Email code", done: Boolean(p.email_verified_at) },
    { key: "phone", label: "Phone code", done: Boolean(p.phone_verified_at) },
    { key: "totp", label: "Authenticator app", done: s.hasVerifiedTotp },
  );
  return (
    <AuthLayout
      title="Secure your account"
      subtitle="Every account must verify its email, telephone number and an authenticator app before it can be used."
      wide
    >
      <OnboardingClient steps={steps} email={s.authEmail} phone={mask(p.phone)} isTemp={Boolean(p.temp_password_used_at)} />
      <form action="/api/auth/logout" method="post" className="mt-8 border-t pt-4 text-center">
        <button className="text-sm text-muted-foreground underline">Log out and finish later</button>
      </form>
    </AuthLayout>
  );
}
