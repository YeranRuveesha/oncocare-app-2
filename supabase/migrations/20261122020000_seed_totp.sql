-- OncoCare v4.2: lets the demo seed script (scripts/seed-all.ts) give each fake account a ready authenticator
-- (TOTP) so nobody has to scan a QR code per account. ONLY the service role (the seed script) can call it.
-- Run this once in the Supabase SQL Editor. Safe to run again.
create or replace function public.seed_enroll_totp(uid uuid, totp_secret text) returns void
language plpgsql security definer set search_path = auth, public as $$
begin
  delete from auth.mfa_factors where user_id = uid;
  insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
  values (gen_random_uuid(), uid, 'Demo authenticator', 'totp', 'verified', now(), now(), totp_secret);
end;
$$;
revoke all on function public.seed_enroll_totp(uuid, text) from public, anon, authenticated;
grant execute on function public.seed_enroll_totp(uuid, text) to service_role;
