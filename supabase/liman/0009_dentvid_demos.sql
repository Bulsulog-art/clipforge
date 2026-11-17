-- ============================================================
-- DentVideo personalised demo links (Liman) — NOT applied automatically.
-- Additive and idempotent; safe to run twice. Apply by hand (Liman SQL
-- editor or psql) after 0001–0008. The web app works without it: the
-- /admin/demos page says the table is missing and every /d/<token> link
-- answers with the ordinary 404.
--
-- One row per clinic we contact with a demo link
-- (dentvideo.com/<lang>/d/<token>). Created by the owner on /admin/demos
-- from public business information (name, city, country, colour, logo).
-- The logo copy lives in the private "dentvid" bucket under
-- demos/<token>.<ext>, written by the service role.
--
-- Retention (privacy policy §7): a demo expires 60 days after it was made;
-- expired rows and their logos are deleted by the app
-- (web/src/lib/dentvid/demos-server.ts purgeExpiredDemos, run whenever
-- /admin/demos is opened). A clinic that signs up gets its own copy of the
-- logo in its own folder.
--
-- Written and read by the service role only (admin routes, the public demo
-- page, the view counter): RLS on, no policies, and no grants to anon or
-- authenticated, so neither can read or write it through PostgREST — one
-- demo can never be listed from another.
-- ============================================================

create table if not exists public.dentvid_demos (
  id              bigint generated always as identity primary key,
  token           text not null unique check (token ~ '^[A-Za-z0-9]{10,12}$'),
  clinic_name     text not null check (char_length(clinic_name) between 1 and 80),
  city            text check (city is null or char_length(city) <= 60),
  country         text check (country is null or country ~ '^[A-Z]{2}$'),
  language        text not null default 'en' check (language ~ '^[a-z]{2}$'),
  colour          text check (colour is null or colour ~ '^#[0-9a-f]{6}$'),
  logo_path       text check (logo_path is null or logo_path ~ '^demos/[A-Za-z0-9]{10,12}\.(png|jpg|webp)$'),
  note            text check (note is null or char_length(note) <= 500),
  campaign        text not null default 'tr-launch' check (campaign ~ '^[a-z0-9][a-z0-9._-]{0,39}$'),
  created_by      uuid,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '60 days'),
  disabled        boolean not null default false,
  view_count      integer not null default 0 check (view_count >= 0),
  last_viewed_at  timestamptz
);

create index if not exists dentvid_demos_created on public.dentvid_demos (created_at desc);
create index if not exists dentvid_demos_expires on public.dentvid_demos (expires_at);

alter table public.dentvid_demos enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads or writes.
revoke all on public.dentvid_demos from anon, authenticated;

comment on table public.dentvid_demos is 'DentVideo personalised demo links (public business info of contacted clinics, kept up to 60 days). Service role only.';

-- Checks (run after applying) -------------------------------------------------
-- select relrowsecurity from pg_class where oid = 'public.dentvid_demos'::regclass;   -- t
-- select count(*) from pg_policies where tablename = 'dentvid_demos';                  -- 0
-- select has_table_privilege('anon', 'public.dentvid_demos', 'select');                -- f
-- select has_table_privilege('authenticated', 'public.dentvid_demos', 'select');       -- f
-- select token, clinic_name, view_count, expires_at from public.dentvid_demos order by created_at desc limit 20;
