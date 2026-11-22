import { HeartPulse } from "lucide-react";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { logoUrl, signedPhotoUrl } from "@/lib/media";
import { daysSinceTransplant } from "@/lib/profileData";
import { ROLE_LABEL, fullName, isClinician, type Role } from "@/lib/roles";
import type { ActiveSession } from "@/lib/session";
import Avatar from "./Avatar";
import DemoNotice from "./DemoNotice";
import PlatformLogo from "./PlatformLogo";
import Sidebar, { AvatarMenu, type NavItem } from "./Sidebar";

function navFor(role: Role, counts: { approvals: number }): NavItem[] {
  if (role === "patient")
    return [
      { href: "/patient", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/patient/daily-log", label: "Daily Log", icon: "log" },
      { href: "/patient/rehabilitation", label: "Rehabilitation", icon: "rehab" },
      { href: "/patient/report", label: "Report Symptoms", icon: "report" },
      { href: "/patient/progress", label: "My Progress", icon: "progress" },
      { href: "/patient/discharge-instructions", label: "Discharge Instructions", icon: "discharge" },
      { href: "/profile", label: "My Profile", icon: "profile" },
    ];
  if (isClinician(role))
    return [
      { href: "/clinician", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/clinician/patients", label: "My Patients", icon: "patients" },
      { href: "/clinician/triage", label: "Triage Queue", icon: "triage" },
      { href: "/profile", label: "My Profile", icon: "profile" },
    ];
  if (role === "hospital_admin")
    return [
      { href: "/hospital", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/hospital/patients", label: "Patients", icon: "patients" },
      { href: "/hospital/clinicians", label: "Clinicians", icon: "clinicians" },
      { href: "/hospital/approvals", label: "Approvals", icon: "approvals", badge: counts.approvals },
      { href: "/hospital/discharge-instructions", label: "Discharge Instructions", icon: "discharge" },
      { href: "/hospital/branding", label: "Hospital Branding", icon: "branding" },
      { href: "/hospital/audit", label: "Audit Log", icon: "audit" },
      { href: "/profile", label: "My Profile", icon: "profile" },
    ];
  return [
    { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/admin/hospitals", label: "Hospitals", icon: "hospitals" },
    { href: "/admin/hospital-admins", label: "Hospital Admins", icon: "hadmins" },
    { href: "/admin/admins", label: "Admins", icon: "admins" },
    { href: "/admin/approvals", label: "Approvals", icon: "approvals", badge: counts.approvals },
    { href: "/admin/audit", label: "Platform Audit Log", icon: "audit" },
    { href: "/profile", label: "My Profile", icon: "profile" },
  ];
}

/** Hospital logo + name (white-label). Placeholder icon when there is no logo. */
function HospitalHeader({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={`${name} logo`} className="size-12 shrink-0 rounded-lg border bg-white object-contain p-1" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
          <HeartPulse className="size-6" />
        </span>
      )}
      <p className="min-w-0 font-display text-base font-bold leading-tight text-ink">{name}</p>
    </div>
  );
}

export default async function AppShell({ session, children }: { session: ActiveSession; children: React.ReactNode }) {
  const { profile, hospital } = session;
  const db = createServiceClient();
  const userClient = await createUserClient();
  const photo = await signedPhotoUrl(userClient, profile.photo_path);
  const name = fullName(profile);

  // Counts for the Approvals badge.
  let approvals = 0;
  if (profile.role === "hospital_admin" && profile.hospital_id) {
    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", profile.hospital_id).eq("status", "pending_approval"),
      db.from("change_requests").select("id", { count: "exact", head: true }).eq("hospital_id", profile.hospital_id).eq("status", "pending").in("requester_role", ["patient", "junior_doctor", "senior_consultant"]),
    ]);
    approvals = (c1 ?? 0) + (c2 ?? 0);
  } else if (profile.role === "platform_admin") {
    const { count } = await db
      .from("change_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .or(`requester_role.eq.hospital_admin,and(requester_role.eq.platform_admin,requester_id.neq.${profile.id})`);
    approvals = count ?? 0;
  }

  // Panel header: platform logo for the Admin, hospital logo + name for everyone else.
  let header: React.ReactNode = <PlatformLogo href="/admin" subtitle="Platform Admin" />;
  if (profile.role !== "platform_admin" && hospital) {
    header = <HospitalHeader name={hospital.name} logo={logoUrl(hospital.logo_path)} />;
  }
  if (profile.role === "patient") {
    const { data: pd } = await db.from("patient_details").select("assigned_doctor_id, diagnosis, diagnosis_other, transplant_type, transplant_date").eq("profile_id", profile.id).maybeSingle();
    let doctor = "";
    if (pd?.assigned_doctor_id) {
      const { data: d } = await db.from("profiles").select("given_names, last_name").eq("id", pd.assigned_doctor_id).maybeSingle();
      if (d) doctor = `Dr ${fullName(d)}`;
    }
    const day = daysSinceTransplant(pd?.transplant_date);
    header = (
      <div className="flex flex-col gap-4">
        {header}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-muted p-3 text-xs">
          <dt className="text-muted-foreground">Doctor</dt>
          <dd className="font-medium">{doctor || "Not assigned"}</dd>
          <dt className="text-muted-foreground">Diagnosis</dt>
          <dd className="font-medium">{pd?.diagnosis === "Other" && pd.diagnosis_other ? pd.diagnosis_other : pd?.diagnosis}</dd>
          <dt className="text-muted-foreground">Transplant</dt>
          <dd className="font-medium">{pd?.transplant_type}</dd>
          <dt className="text-muted-foreground">Post-transplant</dt>
          <dd className="font-display text-base font-extrabold text-brand">Day +{day ?? 0}</dd>
        </dl>
      </div>
    );
  }

  const avatar = (
    <AvatarMenu name={name} roleLabel={ROLE_LABEL[profile.role]}>
      <Avatar name={name} url={photo} size={36} />
    </AvatarMenu>
  );

  return (
    <div className="min-h-screen bg-ice lg:flex">
      <Sidebar items={navFor(profile.role, { approvals })} header={header} avatar={avatar} />
      <div className="min-w-0 flex-1">
        <DemoNotice />
        <div className="hidden items-center justify-end gap-3 border-b bg-white px-8 py-2.5 lg:flex">
          <span className="text-right text-sm leading-tight">
            <span className="block font-semibold">{name}</span>
            <span className="block text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
          </span>
          {avatar}
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
