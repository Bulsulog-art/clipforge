-- DentVideo: how much of the existing data is internal traffic? READ-ONLY report.
--
-- Classifies existing accounts, clinics, funnel events and ad rows with the
-- same rule as web/src/lib/dentvid/internal-traffic.ts:
--   an account is internal when its email matches an internal pattern, or
--   its app_metadata.internal is true;
--   an event is internal when props.internal = true, or its clinic belongs
--   to an internal account.
--
-- It changes nothing: every query is a SELECT inside a READ ONLY transaction
-- that is rolled back at the end. No backfill is written — the app tags new
-- events itself, and the admin views leave internal clinics' events out at
-- read time.
--
-- Run on Liman (as a role that can read auth.* and public.dentvid_*):
--   psql "$LIMAN_DB_URL" -f scripts/dentvideo-internal-report.sql
--
-- Patterns: the built-in defaults are below (the app's syntax: `*` = any run
-- of characters). To mirror DENTVID_INTERNAL_EMAIL_PATTERNS, pass its value
-- for this run only — never commit personal addresses to the repo:
--   psql "$LIMAN_DB_URL" -v extra="$DENTVID_INTERNAL_EMAIL_PATTERNS" -f scripts/dentvideo-internal-report.sql
-- (comma-separated; "@example.com" means "*@example.com", as in the app).
--
-- Caveat: anonymous events from before tagging existed (landing_view,
-- preview_*, cta_clicked …) carry no account and are NOT classified here;
-- docs/ADS_TRACKING.md "Internal traffic" says how to read them.

\set ON_ERROR_STOP on
\if :{?extra}
\else
  \set extra ''
\endif

begin transaction read only;

-- 1. Accounts (DentVideo accounts only; Liman hosts other apps too).
with pats as (
  select distinct lower(replace(n, '*', '%')) as pattern
  from unnest(array['*@bulsulabs.com', '*@bulsulogistics.com', '*@dentvideo.com', 'e2e-monitor+*@*', 'e2e*@*', 'qa+*@*', 'dvq*+*@*'] || string_to_array(:'extra', ',')) as p,
    lateral (select case when left(trim(p), 1) = '@' then '*' || trim(p) else trim(p) end as n) as norm
  where n like '%_@_%'
), users as (
  select u.id, lower(u.email) as email,
    coalesce(u.raw_app_meta_data ->> 'internal', '') = 'true' as flagged,
    exists (select 1 from pats where lower(u.email) like pats.pattern) as by_pattern,
    (u.raw_app_meta_data ->> 'product') = 'dentvideo' or coalesce(u.raw_app_meta_data -> 'products', '[]'::jsonb) ? 'dentvideo' as dentvideo
  from auth.users u
)
select
  count(*) as dentvideo_accounts,
  count(*) filter (where flagged or by_pattern) as internal,
  count(*) filter (where by_pattern) as internal_by_pattern,
  count(*) filter (where flagged) as internal_by_app_metadata,
  count(*) filter (where not (flagged or by_pattern)) as external
from users
where dentvideo;

-- 1b. Which pattern the internal accounts matched (no address is printed: the pattern and a count only).
with pats as (
  select distinct lower(replace(n, '*', '%')) as pattern
  from unnest(array['*@bulsulabs.com', '*@bulsulogistics.com', '*@dentvideo.com', 'e2e-monitor+*@*', 'e2e*@*', 'qa+*@*', 'dvq*+*@*'] || string_to_array(:'extra', ',')) as p,
    lateral (select case when left(trim(p), 1) = '@' then '*' || trim(p) else trim(p) end as n) as norm
  where n like '%_@_%'
)
select pats.pattern, count(distinct u.id) as accounts
from auth.users u
join pats on lower(u.email) like pats.pattern
where (u.raw_app_meta_data ->> 'product') = 'dentvideo' or coalesce(u.raw_app_meta_data -> 'products', '[]'::jsonb) ? 'dentvideo'
group by pats.pattern
order by accounts desc;

-- 2. Sign-ups in the audit log (deleted accounts included: the monitor deletes its own).
with pats as (
  select distinct lower(replace(n, '*', '%')) as pattern
  from unnest(array['*@bulsulabs.com', '*@bulsulogistics.com', '*@dentvideo.com', 'e2e-monitor+*@*', 'e2e*@*', 'qa+*@*', 'dvq*+*@*'] || string_to_array(:'extra', ',')) as p,
    lateral (select case when left(trim(p), 1) = '@' then '*' || trim(p) else trim(p) end as n) as norm
  where n like '%_@_%'
)
select
  count(*) as signups_logged,
  count(*) filter (where exists (select 1 from pats where lower(a.payload -> 'traits' ->> 'user_email') like pats.pattern)) as internal_by_pattern
from auth.audit_log_entries a
where a.payload ->> 'action' in ('user_signedup', 'user_invited');

-- 3. Clinics, 4. events and 5. ad rows, classified through their owner.
with pats as (
  select distinct lower(replace(n, '*', '%')) as pattern
  from unnest(array['*@bulsulabs.com', '*@bulsulogistics.com', '*@dentvideo.com', 'e2e-monitor+*@*', 'e2e*@*', 'qa+*@*', 'dvq*+*@*'] || string_to_array(:'extra', ',')) as p,
    lateral (select case when left(trim(p), 1) = '@' then '*' || trim(p) else trim(p) end as n) as norm
  where n like '%_@_%'
), internal_users as (
  select u.id from auth.users u
  where coalesce(u.raw_app_meta_data ->> 'internal', '') = 'true'
     or exists (select 1 from pats where lower(u.email) like pats.pattern)
), internal_clinics as (
  select c.id from public.dentvid_clinics c where c.owner_id in (select id from internal_users)
)
select
  (select count(*) from public.dentvid_clinics) as clinics,
  (select count(*) from internal_clinics) as internal_clinics,
  (select count(*) from public.dentvid_events) as events,
  (select count(*) from public.dentvid_events e where e.props ->> 'internal' = 'true') as events_tagged_internal,
  (select count(*) from public.dentvid_events e
     where e.props ->> 'internal' is distinct from 'true' and e.clinic_id in (select id from internal_clinics)) as events_internal_via_clinic,
  (select count(*) from public.dentvid_events e
     where e.props ->> 'internal' is distinct from 'true' and (e.clinic_id is null or e.clinic_id not in (select id from internal_clinics))) as events_not_classified,
  (select count(*) from public.dentvid_events e
     where e.props ->> 'internal' is distinct from 'true' and e.props ->> 'utm_medium' in ('cpc', 'ppc', 'paid')) as untagged_events_with_paid_utm,
  (select count(*) from public.dentvid_ad_clicks k where k.owner_id in (select id from internal_users)) as internal_ad_clicks,
  (select count(*) from public.dentvid_ad_conversions v where v.owner_id in (select id from internal_users)) as internal_ad_conversions,
  (select count(*) from public.dentvid_ad_conversions v where v.owner_id in (select id from internal_users) and v.exported_at is null) as internal_ad_conversions_unexported;

-- 4b. Events per name: how many are internal by tag or clinic.
with pats as (
  select distinct lower(replace(n, '*', '%')) as pattern
  from unnest(array['*@bulsulabs.com', '*@bulsulogistics.com', '*@dentvideo.com', 'e2e-monitor+*@*', 'e2e*@*', 'qa+*@*', 'dvq*+*@*'] || string_to_array(:'extra', ',')) as p,
    lateral (select case when left(trim(p), 1) = '@' then '*' || trim(p) else trim(p) end as n) as norm
  where n like '%_@_%'
), internal_clinics as (
  select c.id from public.dentvid_clinics c join auth.users u on u.id = c.owner_id
  where coalesce(u.raw_app_meta_data ->> 'internal', '') = 'true'
     or exists (select 1 from pats where lower(u.email) like pats.pattern)
)
select
  e.name,
  count(*) as events,
  count(*) filter (where e.props ->> 'internal' = 'true' or e.clinic_id in (select id from internal_clinics)) as internal
from public.dentvid_events e
group by e.name
order by events desc;

rollback;
