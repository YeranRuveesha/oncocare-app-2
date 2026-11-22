import { cookies } from "next/headers";
import Link from "next/link";
import ResetClient from "@/components/auth/ResetClient";
import AuthLayout from "@/components/shell/AuthLayout";

export default async function ResetPage() {
  const ok = (await cookies()).get("oc_recovery")?.value === "1";
  return (
    <AuthLayout title="Reset password">
      {ok ? (
        <ResetClient />
      ) : (
        <p className="text-sm text-muted-foreground">
          Open the link from your reset email first. <Link href="/forgot-password" className="font-medium text-primary underline">Ask for a new link</Link>.
        </p>
      )}
    </AuthLayout>
  );
}
