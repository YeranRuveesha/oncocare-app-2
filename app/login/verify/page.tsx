import { redirect } from "next/navigation";
import MfaForm from "@/components/auth/MfaForm";
import AuthLayout from "@/components/shell/AuthLayout";
import { getSessionState, nextPath } from "@/lib/session";

export default async function VerifyPage() {
  const s = await getSessionState();
  if (!s) redirect("/login");
  if (s.gate !== "mfa") redirect(nextPath(s));
  return (
    <AuthLayout title="Authenticator code" subtitle="Open your authenticator app and type the 6-digit code for OncoCare BMT.">
      <MfaForm />
      <form action="/api/auth/logout" method="post" className="mt-6 text-center">
        <button className="text-sm text-muted-foreground underline">Cancel and log out</button>
      </form>
    </AuthLayout>
  );
}
