-- ============================================================
-- DentVideo Google Ads measurement (Liman) — NOT applied automatically.
-- Additive and idempotent; safe to run twice. Apply by hand (Liman SQL
-- editor or psql) after 0001–0018. The web app works without it: the writes
-- fail soft (logged "apply migration 0019") and /admin/ads says the tables
-- are missing.
--
-- dentvid_ad_clicks: the Google Ads click (gclid / gbraid / wbraid) an
--   account was created from — one per account, written at sign-up
--   (web/src/app/api/dentvideo/signup/route.ts). Stored only when the
--   visitor accepted the consent prompt (EU/EEA/UK/CH, or unknown country)
--   or came from a country where no prompt applies (consent 'not_required').
-- dentvid_ad_conversions: offline conversions to upload to Google Ads —
--   'dv_signup' (5 USD, at sign-up) and 'dv_paid' (100 USD, the clinic's
--   first activation in the Dodo webhook, lib/dentvid/billing-webhook.ts).
--   unique (owner_id, conversion_name): a replayed webhook or a retried
--   sign-up never counts twice. exported_at is set when the row was in a CSV
--   downloaded from /admin/ads.
--
-- Privacy (privacy policy §2, §5, §7):
-- - no cookie, no IP, no email: the click id, its type, the consent state
--   and times only; the owner id ties it to the account so that deleting
--   the account deletes it (on delete cascade);
-- - retention 90 days from the click: public.dentvid_purge_ad_data()
--   deletes older rows in both tables. The worker's nightly
--   billing-reconcile job and every opening of /admin/ads call it. Where
--   pg_cron is installed it can also run daily:
--     select cron.schedule('dentvid-purge-ad-data', '41 4 * * *', $$select public.dentvid_purge_ad_data()$$);
--
-- Written and read by the service role only (sign-up route, Dodo webhook,
-- /admin/ads): RLS on, no policies, no grants to anon or authenticated.
-- ============================================================

create table if not exists public.dentvid_ad_clicks (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  click_type  text not null check (click_type in ('gclid', 'gbraid', 'wbraid')),
  click_id    text not null check (click_id ~ '^[A-Za-z0-9._-]{6,200}$'),
  consent     text not null check (consent in ('granted', 'not_required')),
  clicked_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists dentvid_ad_clicks_clicked on public.dentvid_ad_clicks (clicked_at);

create table if not exists public.dentvid_ad_conversions (
  id               bigint generated always as identity primary key,
  owner_id         uuid not null references auth.users(id) on delete cascade,
  clinic_id        uuid references public.dentvid_clinics(id) on delete set null,
  conversion_name  text not null check (conversion_name in ('dv_signup', 'dv_paid')),
  conversion_time  timestamptz not null,
  value            numeric(10, 2) not null check (value >= 0),
  currency         text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  click_type       text not null check (click_type in ('gclid', 'gbraid', 'wbraid')),
  click_id         text not null check (click_id ~ '^[A-Za-z0-9._-]{6,200}$'),
  consent          text not null check (consent in ('granted', 'not_required')),
  clicked_at       timestamptz not null,
  exported_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (owner_id, conversion_name)
);

create index if not exists dentvid_ad_conversions_pending on public.dentvid_ad_conversions (conversion_time desc) where exported_at is null;
create index if not exists dentvid_ad_conversions_clicked on public.dentvid_ad_conversions (clicked_at);

alter table public.dentvid_ad_clicks enable row level security;
alter table public.dentvid_ad_conversions enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads or writes.
revoke all on public.dentvid_ad_clicks from anon, authenticated;
revoke all on public.dentvid_ad_conversions from anon, authenticated;

comment on table public.dentvid_ad_clicks is 'DentVideo: the Google Ads click id an account came from (consented or no consent needed). Deleted 90 days after the click. Service role only.';
comment on table public.dentvid_ad_conversions is 'DentVideo: offline conversions (dv_signup, dv_paid) for upload to Google Ads. Deleted 90 days after the click. Service role only.';

-- Retention: click data older than 90 days goes from both tables. Returns the number of rows deleted.
create or replace function public.dentvid_purge_ad_data()
returns integer
language sql
security definer
set search_path = public
as $$
  with a as (delete from public.dentvid_ad_clicks where clicked_at < now() - interval '90 days' returning 1),
       b as (delete from public.dentvid_ad_conversions where clicked_at < now() - interval '90 days' returning 1)
  select ((select count(*) from a) + (select count(*) from b))::integer;
$$;

revoke all on function public.dentvid_purge_ad_data() from public, anon, authenticated;
grant execute on function public.dentvid_purge_ad_data() to service_role;

-- Checks (run after applying) -------------------------------------------------
-- select relname, relrowsecurity from pg_class where relname in ('dentvid_ad_clicks', 'dentvid_ad_conversions');   -- t, t
-- select count(*) from pg_policies where tablename in ('dentvid_ad_clicks', 'dentvid_ad_conversions');               -- 0
-- select has_table_privilege('anon', 'public.dentvid_ad_clicks', 'select');                                         -- f
-- select has_table_privilege('authenticated', 'public.dentvid_ad_conversions', 'select');                           -- f
-- select has_function_privilege('anon', 'public.dentvid_purge_ad_data()', 'execute');                               -- f
-- select public.dentvid_purge_ad_data();                                                                             -- rows deleted
-- select conversion_name, count(*), count(*) filter (where exported_at is null) as pending from public.dentvid_ad_conversions group by 1;
