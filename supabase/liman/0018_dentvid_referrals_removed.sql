-- DentVideo: the clinic referral program was built (#126), applied on 2026-11-15
-- and cancelled the same day by the owner (no discounts, no referral rewards).
-- This removes everything it added. Applied on Liman 2026-11-15. Idempotent.
drop trigger if exists dentvid_clinics_guard_referral on public.dentvid_clinics;
drop function if exists public.dentvid_clinics_guard_referral();
drop table if exists public.dentvid_referral_rewards;
drop index if exists public.dentvid_clinics_referral_code;
drop index if exists public.dentvid_clinics_referred_by;
alter table public.dentvid_clinics drop constraint if exists dentvid_clinics_referral_code_check;
alter table public.dentvid_clinics drop constraint if exists dentvid_clinics_referred_by_code_check;
alter table public.dentvid_clinics drop constraint if exists dentvid_clinics_not_self_referred;
alter table public.dentvid_clinics drop column if exists referral_code;
alter table public.dentvid_clinics drop column if exists referred_by_code;
alter table public.dentvid_clinics drop column if exists referred_by_clinic_id;
alter table public.dentvid_clinics drop column if exists referred_at;
