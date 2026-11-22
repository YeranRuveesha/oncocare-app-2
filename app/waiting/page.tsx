import { redirect } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import AuthLayout from "@/components/shell/AuthLayout";
import { getSessionState, nextPath } from "@/lib/session";

export default async function WaitingPage() {
  const s = await getSessionState();
  if (!s) redirect("/login");
  if (s.gate !== "waiting" || !s.profile) redirect(nextPath(s));
  const rejected = s.profile.status === "rejected";
  return (
    <AuthLayout title={rejected ? "Account not approved" : "Waiting for approval by your Hospital Admin"}>
      <div className="flex flex-col items-center gap-4 text-center">
        {rejected ? <XCircle className="size-12 text-crimson" /> : <Clock className="size-12 text-[#1B7A7E]" />}
        {rejected ? (
          <>
            <p className="text-sm text-muted-foreground">Your Hospital Admin did not approve this account. Their reason:</p>
            <blockquote className="w-full rounded-lg border bg-muted px-4 py-3 text-left text-sm">{s.profile.status_reason || "No reason given."}</blockquote>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account ({s.profile.user_code}) is verified. The Hospital Admin of <b>{s.hospital?.name}</b> will check your SLMC number. You cannot see any patient
            information until then. Please check back later.
          </p>
        )}
        <form action="/api/auth/logout" method="post">
          <button className="text-sm font-medium text-primary underline">Log out</button>
        </form>
      </div>
    </AuthLayout>
  );
}
