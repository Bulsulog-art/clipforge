-- ============================================================
-- DentVideo first-party funnel events (Liman) — NOT applied automatically.
-- Additive and idempotent; safe to run twice. Apply by hand (Liman SQL
-- editor or psql) after 0001–0004. The web app works without it: event
-- writes fail soft and the owner dashboard shows an empty funnel.
--
-- One row per funnel step (landing_view, signup_completed, …; the allow-list
-- and the per-event prop rules live in web/src/lib/dentvid/events.ts).
-- Privacy: no cookies, no IP address, no user agent, no email or name —
-- props hold only enumerated values (tier, interval, where, utm source,
-- referrer host, counts). clinic_id is set for events of a signed-in clinic.
--
-- Written and read by the service role only (the /api/dentvideo/event route,
-- server routes, the owner dashboard): RLS on, no policies, so the anon and
-- authenticated roles can neither read nor write it through PostgREST.
-- ============================================================

create table if not exists public.dentvid_events (
  id          bigint generated always as identity primary key,
  name        text not null check (name ~ '^[a-z_]{3,40}$'),
  locale      text check (locale is null or locale ~ '^[a-z]{2}$'),
  props       jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2048),
  clinic_id   uuid references public.dentvid_clinics(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists dentvid_events_created on public.dentvid_events (created_at desc);
create index if not exists dentvid_events_name_created on public.dentvid_events (name, created_at desc);
create index if not exists dentvid_events_clinic on public.dentvid_events (clinic_id, created_at desc) where clinic_id is not null;

alter table public.dentvid_events enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads or writes.
revoke all on public.dentvid_events from anon, authenticated;

comment on table public.dentvid_events is 'DentVideo funnel events (first-party, no PII, no IP). Service role only.';

-- Checks (run after applying) -------------------------------------------------
-- select relrowsecurity from pg_class where oid = 'public.dentvid_events'::regclass;  -- t
-- select count(*) from pg_policies where tablename = 'dentvid_events';                 -- 0
-- select name, count(*) from public.dentvid_events where created_at > now() - interval '7 days' group by 1 order by 2 desc;
