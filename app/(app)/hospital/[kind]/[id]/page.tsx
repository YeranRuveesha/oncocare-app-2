import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmAction from "@/components/admin/ConfirmAction";
import EditPerson from "@/components/admin/EditPerson";
import ReviewButtons from "@/components/admin/ReviewButtons";
import PhotoUpload from "@/components/profile/PhotoUpload";
import { StatusBadge } from "@/components/profile/ProfileClient";
import PageHeader from "@/components/shell/PageHeader";
import { FormAlert } from "@/components/ui/field";
import { loadManagedPerson, kindOf } from "@/lib/hospitalUsers";
import { signedPhotoUrl } from "@/lib/media";
import { loadFullProfile } from "@/lib/profileData";
import { profileRows } from "@/lib/profileRows";
import { ROLE_LABEL, fullName } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

export default async function PersonPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const s = await requirePage(["hospital_admin"]);
  const db = createServiceClient();
  const person = await loadManagedPerson(db, s.profile, id);
  if (!person || kindOf(person.role) !== kind) notFound();
  const fp = (await loadFullProfile(db, id))!;
  const photo = await signedPhotoUrl(await createUserClient(), person.photo_path); // Storage RLS: own hospital only
  const name = fullName(person);
  const rows = profileRows(fp);

  const initial: Record<string, unknown> = {
    last_name: person.last_name, given_names: person.given_names, email: person.email, phone: person.phone, nic: person.nic,
    ...(fp.patient ?? {}),
    ...(fp.clinician ? { ...fp.clinician, clinician_role: person.role, years_experience: fp.clinician.years_experience ?? "" } : {}),
  };
  for (const k of Object.keys(initial)) if (initial[k] === null) initial[k] = "";

  return (
    <>
      <p className="mb-2 text-sm"><Link className="text-primary hover:underline" href={`/hospital/${kind}`}>← {kind === "patients" ? "Patients" : "Clinicians"}</Link></p>
      <PageHeader title={name} description={`${ROLE_LABEL[person.role]} · ${person.user_code}`} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col items-center gap-4 rounded-xl border bg-white p-6 shadow-sm lg:self-start">
          <PhotoUpload name={name} url={photo} canEdit={false} uploadUrl={`/api/hospital/users/${id}/photo`} />
          <dl className="grid w-full grid-cols-2 gap-2 border-t pt-4 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd><StatusBadge status={person.status} /></dd>
            <dt className="text-muted-foreground">Member since</dt>
            <dd>{new Date(person.created_at).toLocaleDateString("en-GB")}</dd>
            <dt className="text-muted-foreground">Email verified</dt>
            <dd>{person.email_verified_at ? "Yes" : "No"}</dd>
            <dt className="text-muted-foreground">Phone verified</dt>
            <dd>{person.phone_verified_at ? "Yes" : "No"}</dd>
          </dl>
          {person.status_reason && <FormAlert kind="warning">Reason: {person.status_reason}</FormAlert>}
        </aside>
        <div className="flex flex-col gap-6">
          {person.status === "pending_approval" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-900">
                Waiting for your approval. Check SLMC number <span className="font-mono">{fp.clinician?.slmc_no}</span> before approving.
              </p>
              <ReviewButtons url={`/api/hospital/users/${id}/review`} approveLabel="Approve account" />
            </div>
          )}
          <section className="rounded-xl border bg-white shadow-sm">
            <h2 className="border-b px-5 py-3 font-display text-base font-bold">Profile</h2>
            <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.key}>
                  <dt className="text-xs text-muted-foreground">{r.label}</dt>
                  <dd className="font-medium">{r.display || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
          <EditPerson kind={kind as "patients" | "clinicians"} id={id} hospitalId={s.profile.hospital_id!} initial={initial} />
          <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-bold">Account actions</h2>
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                url={`/api/hospital/users/${id}/action`}
                body={{ action: "reset_mfa" }}
                label="Reset authenticator"
                title="Reset authenticator (lost phone)"
                description="Only do this after confirming the person's identity. They will set up a new authenticator app at their next login."
              />
              {person.status === "deactivated" ? (
                <ConfirmAction url={`/api/hospital/users/${id}/action`} body={{ action: "reactivate" }} label="Reactivate" title="Reactivate this account" />
              ) : (
                <ConfirmAction
                  url={`/api/hospital/users/${id}/action`}
                  body={{ action: "deactivate" }}
                  label="Delete (deactivate)"
                  variant="destructive"
                  danger
                  title="Deactivate this account"
                  description="Soft delete: the person can no longer log in. Their data is kept for audit. You can reactivate later."
                  confirmText={person.user_code}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
