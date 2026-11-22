import AdminProfileEditor from "@/components/profile/AdminProfileEditor";
import PhotoUpload from "@/components/profile/PhotoUpload";
import ProfileClient, { StatusBadge, type RequestRow } from "@/components/profile/ProfileClient";
import PageHeader from "@/components/shell/PageHeader";
import { findField } from "@/lib/fields";
import { signedPhotoUrl } from "@/lib/media";
import { loadFullProfile } from "@/lib/profileData";
import { profileRows } from "@/lib/profileRows";
import { ROLE_LABEL, fullName } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

export default async function MyProfile() {
  const s = await requirePage();
  const db = createServiceClient();
  const fp = (await loadFullProfile(db, s.userId))!;
  const supabase = await createUserClient();
  const photo = await signedPhotoUrl(supabase, fp.profile.photo_path);
  // My own requests: read with MY session (RLS: requester sees own).
  const { data: reqs } = await supabase.from("change_requests").select("*").eq("requester_id", s.userId).order("created_at", { ascending: false });
  const requests: RequestRow[] = (reqs ?? []).map((r) => ({ ...r, field_label: findField(fp.profile.role, r.field_name)?.label ?? r.field_name }));
  const name = fullName(fp.profile);

  return (
    <>
      <PageHeader title="My Profile" />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="flex flex-col items-center gap-4 rounded-xl border bg-white p-6 text-center shadow-sm lg:self-start">
          <PhotoUpload name={name} url={photo} />
          <div>
            <p className="font-display text-xl font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{ROLE_LABEL[fp.profile.role]}</p>
          </div>
          <dl className="grid w-full grid-cols-2 gap-2 border-t pt-4 text-left text-sm">
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono font-semibold">{fp.profile.user_code}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd><StatusBadge status={fp.profile.status} /></dd>
            {fp.profile.role !== "platform_admin" && (
              <>
                <dt className="text-muted-foreground">Hospital</dt>
                <dd>{fp.hospitalName}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Member since</dt>
            <dd>{new Date(fp.profile.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</dd>
          </dl>
        </aside>
        {fp.profile.role === "platform_admin" ? (
          <AdminProfileEditor
            userCode={fp.profile.user_code}
            values={{ last_name: fp.profile.last_name, given_names: fp.profile.given_names, nic: fp.profile.nic, email: fp.profile.email, phone: fp.profile.phone }}
            pending={(reqs ?? []).filter((r) => r.status === "approved" && !r.applied_at && (r.field_name === "email" || r.field_name === "phone")).map((r) => ({ id: r.id, field: r.field_name, value: r.new_value }))}
          />
        ) : (
          <ProfileClient rows={profileRows(fp)} role={fp.profile.role} hospitalId={fp.profile.hospital_id} requests={requests} />
        )}
      </div>
    </>
  );
}
