"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import ConfirmAction from "./ConfirmAction";
import CredentialsCard from "./CredentialsCard";

/** Actions on a Hospital Admin or Admin account (Admin only). */
export default function StaffActions({
  url, status, activated, isPrimary, canMakePrimary, email,
}: {
  url: string;
  status: string;
  activated: boolean;
  isPrimary?: boolean;
  canMakePrimary?: boolean;
  email: string;
}) {
  const router = useRouter();
  const [creds, setCreds] = useState<{ userCode: string; tempPassword: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {!activated && status !== "deactivated" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              const res = await api<{ userCode: string; tempPassword: string }>(url, { action: "regenerate" });
              setBusy(false);
              if (!res.ok) return setError(res.error);
              setCreds(res.data);
              router.refresh();
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Resend / regenerate credentials
          </Button>
        )}
        {canMakePrimary && !isPrimary && status === "active" && (
          <ConfirmAction url={url} body={{ action: "make_primary" }} label="Make main admin" title="Make this the main Hospital Admin" needReason={false} />
        )}
        {activated && status !== "deactivated" && (
          <ConfirmAction url={url} body={{ action: "reset_mfa" }} label="Reset authenticator" title="Reset authenticator (lost phone)" description="Only after confirming their identity. They set up a new app at next login." />
        )}
        {status === "deactivated" ? (
          <ConfirmAction url={url} body={{ action: "reactivate" }} label="Reactivate" title="Reactivate this account" />
        ) : (
          <ConfirmAction url={url} body={{ action: "deactivate" }} label="Deactivate" variant="destructive" danger title="Deactivate this account" description="They are logged out and can no longer log in." />
        )}
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      {creds && <CredentialsCard userCode={creds.userCode} tempPassword={creds.tempPassword} email={email} />}
    </div>
  );
}
