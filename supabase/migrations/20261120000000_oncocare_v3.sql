-- ════════════════════════════════════════════════════════════════════
-- OncoCare BMT v3 · 4-role system: database, security rules, storage
-- DEMO ONLY. Fictional data only. Never store real patient information.
--
-- Roles (profiles.role):
--   patient            a transplant patient of ONE hospital
--   junior_doctor      clinician of ONE hospital (routine triage queue)
--   senior_consultant  clinician of ONE hospital (urgent triage queue)
--   hospital_admin     manages the patients and clinicians of ONE hospital
--   platform_admin     "Admin": manages the whole platform, creates hospitals
--
-- Local:   runs automatically on `npx supabase start` / `npx supabase db reset`.
-- Hosted:  Supabase dashboard > SQL Editor > paste this whole file > Run.
--          WARNING: it deletes all OncoCare tables and data first.
-- ════════════════════════════════════════════════════════════════════

-- 0. START CLEAN (removes the old v1/v2 OncoCare tables too) -----------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.triage_alerts, public.symptom_logs, public.change_requests,
  public.audit_logs, public.rate_limits, public.patient_details, public.clinician_details,
  public.profiles, public.hospitals cascade;
drop function if exists public.my_role(), public.my_hospital(), public.is_platform_admin(),
  public.is_aal2(), public.app_ok(), public.enforce_profile_rules(), public.block_audit_changes(),
  public.revoke_user_sessions(uuid), public.photo_owner(text) cascade;

create extension if not exists pgcrypto;

-- 1. TABLES ------------------------------------------------------------------

-- Each hospital is a "tenant" with its own white-label branding.
create table public.hospitals (
  id              uuid primary key default gen_random_uuid(),          -- non-guessable
  code            text not null unique check (code ~ '^[A-Z0-9]{6}$'),  -- auto, read-only
  name            text not null check (char_length(name) between 3 and 100),
  short_name      text not null check (char_length(short_name) between 2 and 20),
  registration_no text not null check (char_length(registration_no) between 2 and 50),
  type            text not null check (type in ('Government', 'Private', 'Teaching', 'Other')),
  address_line    text not null,
  city            text not null,
  district        text not null,
  country         text not null,
  email           text not null,
  phone           text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  logo_path       text,
  primary_color   text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  status          text not null default 'awaiting_admin_setup'
                  check (status in ('awaiting_admin_setup', 'active', 'deactivated')),
  status_reason   text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index hospitals_name_unique on public.hospitals (lower(name));
create unique index hospitals_reg_unique on public.hospitals (lower(registration_no));

-- One profile per login. Role, hospital and User ID are ALWAYS set by the server.
create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  user_code                text not null unique check (user_code ~ '^(PAT|CLN|ADM|SUP)-[0-9]{8}$'),
  role                     text not null check (role in
                           ('patient', 'junior_doctor', 'senior_consultant', 'hospital_admin', 'platform_admin')),
  hospital_id              uuid references public.hospitals (id),
  status                   text not null default 'pending_verification' check (status in
                           ('pending_verification', 'pending_approval', 'active', 'rejected', 'deactivated')),
  status_reason            text,
  last_name                text not null check (char_length(last_name) between 1 and 80),
  given_names              text not null check (char_length(given_names) between 1 and 120),
  email                    text not null check (email = lower(email)),
  phone                    text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  nic                      text not null check (nic ~ '^([0-9]{9}[VX]|[0-9]{12})$'),
  job_title                text,
  staff_id                 text,
  is_primary_admin         boolean not null default false,
  photo_path               text,
  email_verified_at        timestamptz,
  phone_verified_at        timestamptz,
  must_change_password     boolean not null default false,
  temp_password_expires_at timestamptz,
  temp_password_used_at    timestamptz,
  created_by               uuid,
  created_at               timestamptz not null default now(),
  activated_at             timestamptz,
  updated_at               timestamptz not null default now(),
  -- The Admin belongs to no hospital; everybody else belongs to exactly one.
  constraint hospital_matches_role check ((role = 'platform_admin') = (hospital_id is null)),
  constraint code_matches_role check (
    (role = 'patient' and user_code like 'PAT-%') or
    (role in ('junior_doctor', 'senior_consultant') and user_code like 'CLN-%') or
    (role = 'hospital_admin' and user_code like 'ADM-%') or
    (role = 'platform_admin' and user_code like 'SUP-%'))
);
create unique index profiles_email_unique on public.profiles (email);
create unique index profiles_phone_unique on public.profiles (phone);
create unique index profiles_nic_unique on public.profiles (nic);
create index on public.profiles (hospital_id, role, status);

create table public.patient_details (
  profile_id             uuid primary key references public.profiles (id) on delete cascade,
  assigned_doctor_id     uuid not null references public.profiles (id),
  transplant_date        date not null,
  diagnosis              text not null check (diagnosis in ('AML', 'ALL', 'Lymphoma', 'Thalassemia', 'Other')),
  diagnosis_other        text check (char_length(diagnosis_other) <= 120),
  transplant_type        text not null check (transplant_type in ('Autologous', 'Allogeneic')),
  date_of_birth          date not null,
  gender                 text not null check (gender in
                         ('Male', 'Female', 'Binary', 'Non-binary', 'Other', 'Prefer not to say')),
  ec_name                text not null,
  ec_relationship        text not null check (ec_relationship in ('Mother', 'Father', 'Spouse/Partner',
                         'Son', 'Daughter', 'Brother', 'Sister', 'Guardian', 'Friend', 'Other')),
  ec_relationship_other  text,
  ec_phone               text not null check (ec_phone ~ '^\+[1-9][0-9]{6,14}$'),
  constraint dates_make_sense check (transplant_date > date_of_birth)
);
create index on public.patient_details (assigned_doctor_id);

create table public.clinician_details (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  slmc_no             text not null check (slmc_no ~ '^[A-Za-z0-9]{2,20}$'),
  qualifications      text[] not null check (cardinality(qualifications) between 1 and 10),
  specialty           text not null,
  specialty_other     text,
  department          text check (char_length(department) <= 120),
  years_experience    int check (years_experience between 0 and 60)
);
create unique index clinician_slmc_unique on public.clinician_details (upper(slmc_no));

-- Requests to change a LOCKED field. The server applies approved changes.
create table public.change_requests (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.profiles (id) on delete cascade,
  requester_role text not null,
  hospital_id    uuid references public.hospitals (id),
  field_name     text not null,
  old_value      text,
  new_value      text not null,
  reason         text not null check (char_length(reason) between 3 and 500),
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references public.profiles (id),
  review_reason  text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  applied_at     timestamptz  -- email/phone: set after the new value is verified by OTP
);
create index on public.change_requests (hospital_id, status);
create index on public.change_requests (requester_id);

-- Who did what. Cannot be edited or deleted (see trigger below).
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text,
  hospital_id uuid,
  action      text not null,
  target_type text not null,
  target_id   text,
  target_label text,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);
create index on public.audit_logs (hospital_id, created_at desc);

-- Failed login / OTP attempts for rate limiting (server only).
create table public.rate_limits (
  key              text primary key,
  failures         int not null default 0,
  first_failure_at timestamptz not null default now(),
  locked_until     timestamptz
);

-- A patient's daily symptom check-in.
create table public.symptom_logs (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.profiles (id) on delete cascade,
  hospital_id         uuid not null references public.hospitals (id) on delete cascade,
  temperature_c       numeric(4,1) check (temperature_c between 34 and 43),
  symptoms            text[] not null default '{}',
  notes               text check (char_length(notes) <= 1000),
  day_post_transplant int check (day_post_transplant >= 0),
  created_at          timestamptz not null default now()
);
create index on public.symptom_logs (patient_id, created_at desc);

-- The triage result for each check-in = one item in a clinician queue.
create table public.triage_alerts (
  id            uuid primary key default gen_random_uuid(),
  log_id        uuid not null unique references public.symptom_logs (id) on delete cascade,
  patient_id    uuid not null references public.profiles (id) on delete cascade,
  hospital_id   uuid not null references public.hospitals (id) on delete cascade,
  tier          text not null check (tier in ('routine', 'urgent', 'emergency')),
  urgency_score int  not null check (urgency_score between 0 and 100),
  reasons       text[] not null default '{}',
  source        text not null check (source in ('red_flag_rules', 'ai_assist', 'mock_ai')),
  ai_provider   text,
  ai_summary    text,
  status        text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.triage_alerts (hospital_id, status, tier, urgency_score desc);

-- 2. HELPER FUNCTIONS (used by the security policies) -------------------------
-- "security definer" lets them read profiles without RLS loops.
create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.my_hospital() returns uuid
language sql stable security definer set search_path = public as $$
  select hospital_id from public.profiles where id = auth.uid()
$$;

-- Logged in with the authenticator app code in THIS session?
create function public.is_aal2() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- The gate for ALL data: AAL2 session + active, fully verified account in an active hospital.
create function public.app_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_aal2() and exists (
    select 1 from public.profiles p
    left join public.hospitals h on h.id = p.hospital_id
    where p.id = auth.uid()
      and p.status = 'active'
      and p.email_verified_at is not null
      and p.phone_verified_at is not null
      and not p.must_change_password
      and (p.hospital_id is null or h.status <> 'deactivated'))
$$;

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_ok() and coalesce(public.my_role() = 'platform_admin', false)
$$;

-- Logs out a user everywhere (used after password / account detail changes).
create function public.revoke_user_sessions(target uuid) returns void
language sql security definer set search_path = auth, public as $$
  delete from auth.sessions where user_id = target
$$;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- 3. DATABASE RULES THAT EVEN THE SERVER CANNOT BREAK ------------------------
-- A profile can only become usable after email OTP + phone OTP + authenticator
-- (TOTP) are all verified and the temporary password was replaced.
-- The User ID can never change.
create function public.enforce_profile_rules() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'UPDATE' and new.user_code <> old.user_code then
    raise exception 'User ID can never be changed';
  end if;
  if new.status in ('active', 'pending_approval')
     and (tg_op = 'INSERT' or old.status in ('pending_verification')) then
    if new.email_verified_at is null or new.phone_verified_at is null or new.must_change_password
       or not exists (select 1 from auth.mfa_factors f
                      where f.user_id = new.id and f.status = 'verified' and f.factor_type = 'totp') then
      raise exception 'Email OTP, phone OTP and authenticator must all be verified first';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_rules before insert or update on public.profiles
  for each row execute function public.enforce_profile_rules();

create function public.block_audit_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'Audit logs cannot be edited or deleted';
end;
$$;
create trigger audit_logs_read_only before update or delete on public.audit_logs
  for each row execute function public.block_audit_changes();

-- 4. ROW-LEVEL SECURITY ----------------------------------------------------------
alter table public.hospitals         enable row level security;
alter table public.profiles          enable row level security;
alter table public.patient_details   enable row level security;
alter table public.clinician_details enable row level security;
alter table public.change_requests   enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.rate_limits       enable row level security;
alter table public.symptom_logs      enable row level security;
alter table public.triage_alerts     enable row level security;

-- Hospitals: users read their OWN hospital (branding columns only, see grants);
-- the Admin reads all. Nobody writes from the browser: the server does it after checks.
create policy "read own hospital" on public.hospitals for select to authenticated
  using (public.app_ok() and (id = public.my_hospital() or public.is_platform_admin()));

-- Profiles
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "hospital admin reads own hospital" on public.profiles for select to authenticated
  using (public.app_ok() and public.my_role() = 'hospital_admin' and hospital_id = public.my_hospital());
create policy "clinician reads own hospital patients" on public.profiles for select to authenticated
  using (public.app_ok() and public.my_role() in ('junior_doctor', 'senior_consultant')
         and hospital_id = public.my_hospital() and role = 'patient');
create policy "admin reads admins only" on public.profiles for select to authenticated
  using (public.is_platform_admin() and role in ('hospital_admin', 'platform_admin'));
-- Optional field: own photo path (the only profile column a user may write).
create policy "update own photo" on public.profiles for update to authenticated
  using (id = auth.uid() and public.app_ok()) with check (id = auth.uid());

-- Patient details
create policy "read own patient details" on public.patient_details for select to authenticated
  using (profile_id = auth.uid());
create policy "staff read hospital patient details" on public.patient_details for select to authenticated
  using (public.app_ok() and public.my_role() in ('hospital_admin', 'junior_doctor', 'senior_consultant')
         and exists (select 1 from public.profiles p where p.id = profile_id and p.hospital_id = public.my_hospital()));
create policy "update own optional patient fields" on public.patient_details for update to authenticated
  using (profile_id = auth.uid() and public.app_ok()) with check (profile_id = auth.uid());

-- Clinician details
create policy "read own clinician details" on public.clinician_details for select to authenticated
  using (profile_id = auth.uid());
create policy "hospital admin reads clinician details" on public.clinician_details for select to authenticated
  using (public.app_ok() and public.my_role() = 'hospital_admin'
         and exists (select 1 from public.profiles p where p.id = profile_id and p.hospital_id = public.my_hospital()));
create policy "update own optional clinician fields" on public.clinician_details for update to authenticated
  using (profile_id = auth.uid() and public.app_ok()) with check (profile_id = auth.uid());

-- Change requests: requester sees own; each approver sees only what they may review.
create policy "read own change requests" on public.change_requests for select to authenticated
  using (requester_id = auth.uid());
create policy "hospital admin reviews patients and clinicians" on public.change_requests for select to authenticated
  using (public.app_ok() and public.my_role() = 'hospital_admin' and hospital_id = public.my_hospital()
         and requester_role in ('patient', 'junior_doctor', 'senior_consultant'));
create policy "admin reviews hospital admins and other admins" on public.change_requests for select to authenticated
  using (public.is_platform_admin() and (requester_role = 'hospital_admin'
         or (requester_role = 'platform_admin' and requester_id <> auth.uid())));

-- Audit logs: hospital admins see their hospital; the Admin sees platform-level events only.
create policy "hospital admin reads hospital audit" on public.audit_logs for select to authenticated
  using (public.app_ok() and public.my_role() = 'hospital_admin' and hospital_id = public.my_hospital());
create policy "admin reads platform audit" on public.audit_logs for select to authenticated
  using (public.is_platform_admin() and (actor_role = 'platform_admin'
         or target_type in ('hospital', 'hospital_admin', 'platform_admin')));

-- Symptom logs and triage: patients + clinicians only. Admins never see them.
create policy "patient adds own log" on public.symptom_logs for insert to authenticated
  with check (public.app_ok() and patient_id = auth.uid() and public.my_role() = 'patient'
              and hospital_id = public.my_hospital());
create policy "patient reads own logs" on public.symptom_logs for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
create policy "clinician reads hospital logs" on public.symptom_logs for select to authenticated
  using (public.app_ok() and public.my_role() in ('junior_doctor', 'senior_consultant')
         and hospital_id = public.my_hospital());
create policy "patient reads own alerts" on public.triage_alerts for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
create policy "clinician reads hospital alerts" on public.triage_alerts for select to authenticated
  using (public.app_ok() and public.my_role() in ('junior_doctor', 'senior_consultant')
         and hospital_id = public.my_hospital());
create policy "clinician updates alert status" on public.triage_alerts for update to authenticated
  using (public.app_ok() and public.my_role() in ('junior_doctor', 'senior_consultant')
         and hospital_id = public.my_hospital())
  with check (hospital_id = public.my_hospital());

-- 5. TABLE PERMISSIONS (GRANTS) ---------------------------------------------------
-- New Supabase projects give the website roles NO table access by default, so we
-- grant exactly what is needed. RLS above decides WHICH rows.
revoke all on public.hospitals, public.profiles, public.patient_details, public.clinician_details,
  public.change_requests, public.audit_logs, public.rate_limits, public.symptom_logs,
  public.triage_alerts from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant all on public.hospitals, public.profiles, public.patient_details, public.clinician_details,
  public.change_requests, public.audit_logs, public.rate_limits, public.symptom_logs,
  public.triage_alerts to service_role;
grant execute on function public.my_role(), public.my_hospital(), public.is_aal2(), public.app_ok(),
  public.is_platform_admin() to authenticated, service_role;

-- Patients and clinicians may read only the hospital name, logo and colours.
grant select (id, code, name, short_name, logo_path, primary_color, secondary_color, status)
  on public.hospitals to authenticated;
-- Profiles: read (RLS limits rows). NIC/phone columns are readable only where RLS allows.
grant select on public.profiles to authenticated;
grant update (photo_path) on public.profiles to authenticated;         -- optional field
grant select on public.patient_details to authenticated;
grant update (diagnosis_other) on public.patient_details to authenticated;  -- optional field
grant select on public.clinician_details to authenticated;
grant update (department, years_experience) on public.clinician_details to authenticated; -- optional
grant select on public.change_requests to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert on public.symptom_logs to authenticated;
grant select on public.triage_alerts to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.triage_alerts to authenticated;

-- 6. STORAGE: profile photos (PRIVATE) and hospital logos (public images) ---------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
       ('hospital-logos', 'hospital-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photo: own upload" on storage.objects;
drop policy if exists "photo: own replace" on storage.objects;
drop policy if exists "photo: own read" on storage.objects;
drop policy if exists "photo: own remove" on storage.objects;
drop policy if exists "photo: hospital admin read" on storage.objects;
drop policy if exists "photo: hospital admin remove" on storage.objects;
drop policy if exists "photo: admin reads admin photos" on storage.objects;

-- Whose photo is this file? Files live at {user_id}/avatar.webp
create function public.photo_owner(object_name text) returns uuid
language sql immutable as $$
  select case when (storage.foldername(object_name))[1] ~ '^[0-9a-f-]{36}$'
              then ((storage.foldername(object_name))[1])::uuid end
$$;
grant execute on function public.photo_owner(text) to authenticated, service_role;

create policy "photo: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and public.photo_owner(name) = auth.uid() and public.app_ok());
create policy "photo: own replace" on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and public.photo_owner(name) = auth.uid() and public.app_ok());
create policy "photo: own read" on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.photo_owner(name) = auth.uid() and public.app_ok());
create policy "photo: own remove" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and public.photo_owner(name) = auth.uid() and public.app_ok());
create policy "photo: hospital admin read" on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.app_ok() and public.my_role() = 'hospital_admin'
         and exists (select 1 from public.profiles p where p.id = public.photo_owner(name)
                     and p.hospital_id = public.my_hospital()
                     and p.role in ('patient', 'junior_doctor', 'senior_consultant')));
create policy "photo: hospital admin remove" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and public.app_ok() and public.my_role() = 'hospital_admin'
         and exists (select 1 from public.profiles p where p.id = public.photo_owner(name)
                     and p.hospital_id = public.my_hospital()
                     and p.role in ('patient', 'junior_doctor', 'senior_consultant')));
create policy "photo: admin reads admin photos" on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.is_platform_admin()
         and exists (select 1 from public.profiles p where p.id = public.photo_owner(name)
                     and p.role in ('hospital_admin', 'platform_admin')));

-- ════════════════════════════════════════════════════════════════════
-- NEXT STEP: create the first Admin with:   npm run create-admin
-- (see SETUP.md). Then open http://localhost:3000/activate
-- ════════════════════════════════════════════════════════════════════
