-- ════════════════════════════════════════════════════════════════════
-- OncoCare BMT v4 · clinical features (ADDITIVE: it does NOT delete anything)
-- Discharge instructions, daily logs, symptom reports, rehabilitation,
-- progress, clinician access rules, contact messages.
-- DEMO ONLY. Fictional data only.
--
-- Run it AFTER 20261120000000_oncocare_v3.sql.
--   Local:  runs by itself on `npx supabase db reset`.
--   Hosted: Supabase dashboard > SQL Editor > paste this whole file > Run.
-- It is safe to run twice.
-- ════════════════════════════════════════════════════════════════════

-- 1. WHO MAY SEE A PATIENT'S CLINICAL RECORD -------------------------------------
-- Junior Doctor: patients assigned to them.
-- Senior Consultant: patients assigned to them + any patient of their hospital that
-- has an urgent / emergency / escalated report.
-- Hospital Admin and Admin are NEVER included.
create or replace function public.can_view_patient(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.app_ok()
    and public.my_role() in ('junior_doctor', 'senior_consultant')
    and exists (
      select 1 from public.profiles p
      join public.patient_details d on d.profile_id = p.id
      where p.id = pid and p.role = 'patient' and p.hospital_id = public.my_hospital()
        and d.assigned_doctor_id = auth.uid())
$$;
grant execute on function public.can_view_patient(uuid) to authenticated, service_role;

-- 2. SYMPTOM REPORTS (extends the existing tables) ------------------------------
alter table public.symptom_logs add column if not exists structured jsonb not null default '[]'::jsonb;
alter table public.symptom_logs add column if not exists photo_path text;
alter table public.symptom_logs add column if not exists red_flags text[] not null default '{}';

alter table public.triage_alerts drop constraint if exists triage_alerts_status_check;
alter table public.triage_alerts add constraint triage_alerts_status_check
  check (status in ('open', 'acknowledged', 'escalated', 'resolved'));
alter table public.triage_alerts add column if not exists clinician_reply text check (char_length(clinician_reply) <= 1000);
alter table public.triage_alerts add column if not exists replied_by uuid references public.profiles (id) on delete set null;
alter table public.triage_alerts add column if not exists replied_at timestamptz;

-- 3. NEW TABLES ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 100),
  email         text not null check (char_length(email) between 5 and 254),
  hospital_name text check (char_length(hospital_name) <= 150),
  message       text not null check (char_length(message) between 10 and 2000),
  created_at    timestamptz not null default now()
);

create table if not exists public.discharge_instructions (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals (id) on delete cascade,   -- null = platform default
  version     int  not null check (version >= 1),
  title       text not null check (char_length(title) between 3 and 150),
  sections    jsonb not null,
  pdf_path    text,
  is_active   boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create unique index if not exists discharge_version_unique
  on public.discharge_instructions (coalesce(hospital_id, '00000000-0000-0000-0000-000000000000'::uuid), version);
create unique index if not exists discharge_one_active
  on public.discharge_instructions (coalesce(hospital_id, '00000000-0000-0000-0000-000000000000'::uuid)) where is_active;

create table if not exists public.discharge_acknowledgements (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles (id) on delete cascade,
  instruction_id uuid not null references public.discharge_instructions (id) on delete cascade,
  version        int  not null,
  confirmed_at   timestamptz not null default now(),
  unique (patient_id, instruction_id)
);

create table if not exists public.daily_logs (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.profiles (id) on delete cascade,
  hospital_id         uuid not null references public.hospitals (id) on delete cascade,
  log_date            date not null,
  day_post_transplant int  check (day_post_transplant >= 0),
  is_late             boolean not null default false,
  -- vitals
  temperature_c       numeric(4,1) not null check (temperature_c between 34.0 and 42.0),
  heart_rate          int not null check (heart_rate between 30 and 220),
  bp_systolic         int not null check (bp_systolic between 60 and 260),
  bp_diastolic        int not null check (bp_diastolic between 30 and 160),
  spo2                int check (spo2 between 70 and 100),
  weight_kg           numeric(5,1) check (weight_kg between 10 and 300),
  -- how I feel
  pain                int not null check (pain between 0 and 10),
  fatigue             int not null check (fatigue between 0 and 10),
  appetite            text not null check (appetite in ('Good', 'Reduced', 'Poor')),
  nausea              text not null check (nausea in ('None', 'Mild', 'Severe')),
  vomiting_episodes   int not null default 0 check (vomiting_episodes between 0 and 50),
  loose_stools        int not null default 0 check (loose_stools between 0 and 50),
  bleeding            boolean not null default false,
  -- self-care
  mouth_brushing      int not null default 0 check (mouth_brushing between 0 and 6),
  mouth_flossed       boolean not null default false,
  mouth_rinses        int not null default 0 check (mouth_rinses between 0 and 8),
  lip_care            boolean not null default false,
  emollient_times     int not null default 0 check (emollient_times between 0 and 10),
  sun_protection      text not null default 'No' check (sun_protection in ('Yes', 'No', 'Stayed indoors')),
  walking_minutes     int not null default 0 check (walking_minutes between 0 and 600),
  medicines           text not null check (medicines in ('Yes', 'Partly', 'No')),
  notes               text check (char_length(notes) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bp_order check (bp_systolic > bp_diastolic),
  unique (patient_id, log_date)
);
create index if not exists daily_logs_patient_date on public.daily_logs (patient_id, log_date desc);

create table if not exists public.daily_log_edits (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.daily_logs (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  old_values jsonb not null,
  new_values jsonb not null,
  edited_at  timestamptz not null default now()
);

-- A log can be edited for 24 hours after it was first saved, never moved to another day or patient.
create or replace function public.daily_logs_rules() returns trigger
language plpgsql as $$
begin
  if new.patient_id <> old.patient_id or new.log_date <> old.log_date then
    raise exception 'A daily log cannot be moved to another day or patient';
  end if;
  if now() - old.created_at > interval '24 hours' then
    raise exception 'This daily log is locked (it can only be edited for 24 hours)';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists daily_logs_rules on public.daily_logs;
create trigger daily_logs_rules before update on public.daily_logs
  for each row execute function public.daily_logs_rules();

create table if not exists public.exercises (
  id               uuid primary key default gen_random_uuid(),
  hospital_id      uuid references public.hospitals (id) on delete cascade,   -- null = platform library
  name             text not null check (char_length(name) between 3 and 100),
  category         text not null check (category in ('walking', 'stretching', 'breathing', 'light strength', 'balance')),
  description      text not null,
  default_duration text,
  default_sets_reps text,
  precautions      text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.patient_exercise_plan (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.profiles (id) on delete cascade,
  exercise_id        uuid not null references public.exercises (id) on delete cascade,
  status             text not null default 'allowed' check (status in ('allowed', 'restricted')),
  target             text,
  restriction_reason text,
  set_by             uuid references public.profiles (id) on delete set null,
  updated_at         timestamptz not null default now(),
  unique (patient_id, exercise_id),
  constraint restricted_needs_reason check (status = 'allowed' or char_length(coalesce(restriction_reason, '')) >= 3)
);

create table if not exists public.patient_rehab (
  patient_id             uuid primary key references public.profiles (id) on delete cascade,
  paused                 boolean not null default false,
  pause_reason           text,
  walking_target_minutes int not null default 15 check (walking_target_minutes between 5 and 240),
  updated_by             uuid references public.profiles (id) on delete set null,
  updated_at             timestamptz not null default now(),
  constraint paused_needs_reason check (not paused or char_length(coalesce(pause_reason, '')) >= 3)
);

create table if not exists public.exercise_logs (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.profiles (id) on delete cascade,
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  log_date     date not null,
  completed_at timestamptz not null default now(),
  minutes      int not null check (minutes between 1 and 300),
  effort       int not null check (effort between 0 and 10),
  symptoms     boolean not null default false,
  symptom_note text check (char_length(symptom_note) <= 300)
);
create index if not exists exercise_logs_patient_date on public.exercise_logs (patient_id, log_date desc);

-- Who opened which patient record (and exports). Written by the server only.
create table if not exists public.record_access_logs (
  id           uuid primary key default gen_random_uuid(),
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  patient_id   uuid not null references public.profiles (id) on delete cascade,
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  action       text not null check (action in ('view', 'export')),
  detail       text,
  created_at   timestamptz not null default now()
);
create index if not exists record_access_patient on public.record_access_logs (patient_id, created_at desc);

-- 4. ROW-LEVEL SECURITY -----------------------------------------------------------------
alter table public.contact_messages          enable row level security;
alter table public.discharge_instructions    enable row level security;
alter table public.discharge_acknowledgements enable row level security;
alter table public.daily_logs                enable row level security;
alter table public.daily_log_edits           enable row level security;
alter table public.exercises                 enable row level security;
alter table public.patient_exercise_plan     enable row level security;
alter table public.patient_rehab             enable row level security;
alter table public.exercise_logs             enable row level security;
alter table public.record_access_logs        enable row level security;

-- Tighten the clinician rules of v3: only patients they may view (see can_view_patient).
drop policy if exists "clinician reads own hospital patients" on public.profiles;
drop policy if exists "clinician reads viewable patients" on public.profiles;
create policy "clinician reads viewable patients" on public.profiles for select to authenticated
  using (role = 'patient' and public.can_view_patient(id));

drop policy if exists "staff read hospital patient details" on public.patient_details;
drop policy if exists "hospital admin reads patient details" on public.patient_details;
create policy "hospital admin reads patient details" on public.patient_details for select to authenticated
  using (public.app_ok() and public.my_role() = 'hospital_admin'
         and exists (select 1 from public.profiles p where p.id = profile_id and p.hospital_id = public.my_hospital()));
drop policy if exists "clinician reads viewable patient details" on public.patient_details;
create policy "clinician reads viewable patient details" on public.patient_details for select to authenticated
  using (public.can_view_patient(profile_id));

drop policy if exists "clinician reads hospital logs" on public.symptom_logs;
drop policy if exists "clinician reads viewable symptom logs" on public.symptom_logs;
create policy "clinician reads viewable symptom logs" on public.symptom_logs for select to authenticated
  using (public.can_view_patient(patient_id));

drop policy if exists "clinician reads hospital alerts" on public.triage_alerts;
drop policy if exists "clinician updates alert status" on public.triage_alerts;
drop policy if exists "clinician reads viewable alerts" on public.triage_alerts;
create policy "clinician reads viewable alerts" on public.triage_alerts for select to authenticated
  using (public.can_view_patient(patient_id));
drop policy if exists "clinician updates viewable alerts" on public.triage_alerts;
create policy "clinician updates viewable alerts" on public.triage_alerts for update to authenticated
  using (public.can_view_patient(patient_id)) with check (hospital_id = public.my_hospital());

-- Discharge instructions: patients, clinicians and Hospital Admins of that hospital (+ the platform default).
drop policy if exists "read discharge instructions" on public.discharge_instructions;
create policy "read discharge instructions" on public.discharge_instructions for select to authenticated
  using (public.app_ok() and public.my_role() <> 'platform_admin'
         and (hospital_id is null or hospital_id = public.my_hospital()));
drop policy if exists "patient reads own acknowledgements" on public.discharge_acknowledgements;
create policy "patient reads own acknowledgements" on public.discharge_acknowledgements for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads acknowledgements" on public.discharge_acknowledgements;
create policy "clinician reads acknowledgements" on public.discharge_acknowledgements for select to authenticated
  using (public.can_view_patient(patient_id));

-- Daily logs
drop policy if exists "patient reads own daily logs" on public.daily_logs;
create policy "patient reads own daily logs" on public.daily_logs for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads daily logs" on public.daily_logs;
create policy "clinician reads daily logs" on public.daily_logs for select to authenticated
  using (public.can_view_patient(patient_id));
drop policy if exists "patient reads own log edits" on public.daily_log_edits;
create policy "patient reads own log edits" on public.daily_log_edits for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads log edits" on public.daily_log_edits;
create policy "clinician reads log edits" on public.daily_log_edits for select to authenticated
  using (public.can_view_patient(patient_id));

-- Rehabilitation
drop policy if exists "read exercise library" on public.exercises;
create policy "read exercise library" on public.exercises for select to authenticated
  using (public.app_ok() and public.my_role() in ('patient', 'junior_doctor', 'senior_consultant')
         and (hospital_id is null or hospital_id = public.my_hospital()));
drop policy if exists "patient reads own plan" on public.patient_exercise_plan;
create policy "patient reads own plan" on public.patient_exercise_plan for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads plan" on public.patient_exercise_plan;
create policy "clinician reads plan" on public.patient_exercise_plan for select to authenticated
  using (public.can_view_patient(patient_id));
drop policy if exists "patient reads own rehab" on public.patient_rehab;
create policy "patient reads own rehab" on public.patient_rehab for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads rehab" on public.patient_rehab;
create policy "clinician reads rehab" on public.patient_rehab for select to authenticated
  using (public.can_view_patient(patient_id));
drop policy if exists "patient reads own exercise logs" on public.exercise_logs;
create policy "patient reads own exercise logs" on public.exercise_logs for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads exercise logs" on public.exercise_logs;
create policy "clinician reads exercise logs" on public.exercise_logs for select to authenticated
  using (public.can_view_patient(patient_id));
-- contact_messages and record_access_logs: no policy = only the server (service role) can use them.

-- 5. PERMISSIONS (GRANTS) --------------------------------------------------------------
revoke all on public.contact_messages, public.discharge_instructions, public.discharge_acknowledgements,
  public.daily_logs, public.daily_log_edits, public.exercises, public.patient_exercise_plan,
  public.patient_rehab, public.exercise_logs, public.record_access_logs from anon, authenticated;
grant all on public.contact_messages, public.discharge_instructions, public.discharge_acknowledgements,
  public.daily_logs, public.daily_log_edits, public.exercises, public.patient_exercise_plan,
  public.patient_rehab, public.exercise_logs, public.record_access_logs to service_role;
-- The browser session may only READ (RLS decides which rows). Every write goes through the server after checks.
grant select on public.discharge_instructions, public.discharge_acknowledgements, public.daily_logs,
  public.daily_log_edits, public.exercises, public.patient_exercise_plan, public.patient_rehab,
  public.exercise_logs to authenticated;

-- 6. PRIVATE STORAGE BUCKETS (files are served through short-lived signed links) -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('discharge-docs', 'discharge-docs', false, 10485760, array['application/pdf']),
       ('symptom-photos', 'symptom-photos', false, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- No storage policies on purpose: browsers can never read or write these buckets directly.

-- 7. STARTING CONTENT ------------------------------------------------------------------------
-- TODO: clinician review before launch (discharge text and exercises are general information only).
insert into public.discharge_instructions (hospital_id, version, title, sections, is_active)
select null, 1, 'Discharge instructions after a bone marrow or stem cell transplant', $json$[
 {
  "id": "expect",
  "title": "What to expect at home",
  "items": [
   "It can take 6 months or more for your blood counts and immune system to fully recover. During this time you are more likely to get infections, bleeding and skin problems.",
   "Your body is still weak. It may take up to a year to feel like you did before the transplant.",
   "You will probably get tired very easily and may not feel like eating much.",
   "If your bone marrow came from another person, you may develop signs of graft-versus-host disease (GVHD, when the new cells react against your body).",
   "Keep your home clean. Stay away from crowds. Ask visitors who have a cold to wear a mask or not to visit."
  ]
 },
 {
  "id": "mouth",
  "title": "Mouth care",
  "items": [
   "A dry mouth or sores from your transplant medicines can let germs grow in your mouth. A mouth infection can spread to other parts of the body.",
   "Brush your teeth and gums 2 to 3 times a day, for 2 to 3 minutes each time, with a soft-bristle toothbrush. Let the toothbrush air dry between brushings.",
   "Floss gently once a day. Rinse your mouth 4 times a day.",
   "Use your usual lip care products so your lips do not dry out and crack."
  ]
 },
 {
  "id": "infection",
  "title": "Take care not to get an infection",
  "items": [
   "Eat and drink safely. Do not eat or drink anything that may be undercooked or spoiled. Make sure your drinking water is safe.",
   "Be careful when eating out. Do not eat raw vegetables, raw meat, raw fish or anything you are not sure is safe.",
   "Wash your hands with soap and water often: after being outdoors, after touching body fluids such as mucus or blood, after changing a diaper, before handling food, after using the telephone, after housework and after using the bathroom."
  ]
 },
 {
  "id": "avoid",
  "title": "Stay away from",
  "items": [
   "Yard work, flowers and plants.",
   "Be careful with pets and animals. If you have a cat, keep it indoors. Stay away from puppies, kittens and other very young animals. Do not play roughly with cats. Scratches and bites can get infected.",
   "Ask your doctor which vaccines you may need and when to have them."
  ]
 },
 {
  "id": "skin",
  "title": "Looking after your skin",
  "items": [
   "General: for dry skin, use moisturising creams (emollients) regularly and generously, at least 2 to 3 times a day, and use soap substitutes.",
   "Sun protection: ultraviolet (UV) light can set off a flare of skin GVHD and can cause skin reactions to some medicines (for example voriconazole and some anti-inflammatory medicines). Avoid the strongest sunshine hours (11 am to 3 pm), use a broad-spectrum sunscreen of SPF 30 or higher regularly, and wear a wide-brimmed hat, long sleeves, trousers or UV-protective clothing. Covering up works better than sunscreen alone."
  ]
 },
 {
  "id": "selfcare",
  "title": "Other self-care",
  "items": [
   "If you have a central venous line or a PICC line, make sure you know how to look after it.",
   "If your care team tells you your platelet count is low, learn how to prevent bleeding.",
   "Stay active by walking. Slowly increase how far you walk, based on how much energy you have.",
   "Eat enough protein and calories to keep your weight up. Ask your care team about liquid food supplements.",
   "Do not smoke."
  ]
 },
 {
  "id": "followup",
  "title": "Follow-up",
  "items": [
   "You will need close follow-up from your transplant doctor and nurse for at least 3 months. Keep all your appointments."
  ]
 },
 {
  "id": "call",
  "title": "When to call the doctor",
  "type": "when_to_call",
  "items": [
   "Diarrhoea that does not go away, or is bloody",
   "Severe nausea, vomiting or loss of appetite",
   "You cannot eat or drink",
   "Extreme weakness",
   "Redness, swelling or draining from any place where you have an IV line",
   "Pain in your abdomen (tummy)",
   "Fever, chills or sweats (these may be signs of infection)",
   "A new skin rash or blisters",
   "Jaundice (your skin or the whites of your eyes look yellow)",
   "A very bad headache, or a headache that does not go away",
   "A cough that is getting worse",
   "Trouble breathing at rest or when doing simple tasks",
   "Burning when you urinate (pass urine)"
  ]
 }
]$json$::jsonb, true
where not exists (select 1 from public.discharge_instructions where hospital_id is null);

insert into public.exercises (hospital_id, name, category, description, default_duration, default_sets_reps, precautions)
select null, v.* from (values
  ('Slow walk','walking','Walk at an easy pace on flat ground, indoors or in a clean, quiet area.','10 minutes','1 time','Stop if you feel dizzy, short of breath or have pain. Avoid crowded places.'),
  ('Seated marching','balance','Sit on a sturdy chair and lift your knees one at a time, as if marching.','2 minutes','2 sets of 10','Keep your back straight. Hold the chair if you feel unsteady.'),
  ('Ankle circles','stretching','Sit or lie down and slowly draw circles with your toes, in both directions.','2 minutes','10 each way, each foot','Move gently. Stop if you have calf pain or swelling.'),
  ('Shoulder rolls','stretching','Sit tall and slowly roll both shoulders backwards, then forwards.','2 minutes','10 each way','Keep the movement small and smooth.'),
  ('Deep breathing','breathing','Breathe in slowly through your nose for 4 counts, hold for 2, and breathe out through pursed lips for 6 counts.','5 minutes','5 breaths, 2 times','Sit comfortably. Stop and rest if you feel light-headed.'),
  ('Seated arm raises','light strength','Sit tall and raise both arms to shoulder height, then lower slowly. No weights.','3 minutes','2 sets of 8','Do not hold your breath. Stop if you feel pain.'),
  ('Sit-to-stand','light strength','Sit on a firm chair, stand up slowly, then sit back down with control.','3 minutes','2 sets of 5','Use a chair that cannot slide. Ask for help if you feel weak.'),
  ('Heel raises','balance','Hold a countertop and lift your heels, then lower them slowly.','2 minutes','2 sets of 8','Hold on at all times. Stop if you feel dizzy.'),
  ('Gentle neck stretch','stretching','Slowly tilt your ear toward your shoulder, hold a moment, and switch sides.','2 minutes','5 each side','Never force the stretch.'),
  ('Pursed-lip breathing walk','walking','Walk slowly and breathe in through your nose and out through pursed lips.','10 minutes','1 time','Slow down if you cannot talk comfortably while walking.')
) as v(name, category, description, default_duration, default_sets_reps, precautions)
where not exists (select 1 from public.exercises where hospital_id is null);


-- 8. REHAB CHANGE HISTORY (the reasons stay in the clinical record, not in the admin audit log) --
create table if not exists public.rehab_changes (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  changed_by  uuid references public.profiles (id) on delete set null,
  action      text not null check (action in ('set', 'remove', 'pause', 'resume', 'walking_target')),
  exercise_id uuid references public.exercises (id) on delete set null,
  old_value   jsonb,
  new_value   jsonb,
  reason      text not null check (char_length(reason) between 3 and 300),
  created_at  timestamptz not null default now()
);
create index if not exists rehab_changes_patient on public.rehab_changes (patient_id, created_at desc);
alter table public.rehab_changes enable row level security;
drop policy if exists "patient reads own rehab changes" on public.rehab_changes;
create policy "patient reads own rehab changes" on public.rehab_changes for select to authenticated
  using (public.app_ok() and patient_id = auth.uid());
drop policy if exists "clinician reads rehab changes" on public.rehab_changes;
create policy "clinician reads rehab changes" on public.rehab_changes for select to authenticated
  using (public.can_view_patient(patient_id));
revoke all on public.rehab_changes from anon, authenticated;
grant all on public.rehab_changes to service_role;
grant select on public.rehab_changes to authenticated;

notify pgrst, 'reload schema';
