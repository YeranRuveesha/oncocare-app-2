-- OncoCare v4.1: a doctor (Junior OR Senior) sees ONLY the patients assigned to them.
-- Run this once in the Supabase SQL Editor. Safe to run again.
-- Every clinical table already uses can_view_patient(), so changing this one function is enough.
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
