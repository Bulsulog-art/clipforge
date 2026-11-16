-- DentVideo: did every paying clinic get what it paid for? READ-ONLY report
-- for the daily ops sweep (docs/RELIABILITY.md, "Daily sweep").
--
-- The worker's hourly delivery watchdog writes the same facts to Redis
-- (dv:ops:delivery, shown on /dentvideo/admin/system as "Delivery check");
-- this is the database's own view, for when Redis or the worker is the
-- thing in doubt. It changes nothing: SELECTs inside a READ ONLY
-- transaction that is rolled back.
--
--   psql "$LIMAN_DB_URL" -f scripts/dentvideo-delivery-report.sql
--
-- "This Monday" is the Monday of the current UTC week. A clinic's week is due
-- by Monday 07:00 in its own time zone, so on Monday morning UTC the clinics
-- in the Americas may legitimately still show 0 for this week.

\set ON_ERROR_STOP on
begin transaction read only;

-- 1. Paying clinics, the last week each one got, and this week's state.
with monday as (
  select (date_trunc('week', now() at time zone 'utc'))::date as w
), paying as (
  select c.id, c.profile ->> 'name' as name, c.profile ->> 'country' as country, c.plan_tier, c.plan_renews_at,
    (to_jsonb(c) ->> 'admin_paused_at') is not null as admin_paused
  from public.dentvid_clinics c
  where c.plan = 'active'
), items as (
  select i.clinic_id, i.week_of, i.status
  from public.dentvid_items i
  join paying p on p.id = i.clinic_id
  where i.kind = 'generated' and i.week_of >= (select w from monday) - 56
)
select
  p.id,
  p.name,
  p.country,
  p.plan_tier,
  p.admin_paused,
  p.plan_renews_at,
  (select max(week_of) from items x where x.clinic_id = p.id and x.status in ('ready', 'flagged')) as last_delivered_week,
  (select count(*) from items x where x.clinic_id = p.id and x.week_of = (select w from monday) and x.status in ('ready', 'flagged')) as usable_this_week,
  (select count(*) from items x where x.clinic_id = p.id and x.week_of = (select w from monday) and x.status not in ('ready', 'flagged')) as not_usable_this_week,
  case
    when p.admin_paused then 'paused by owner'
    when (select max(week_of) from items x where x.clinic_id = p.id and x.status in ('ready', 'flagged')) is null then 'NEVER DELIVERED'
    when (select max(week_of) from items x where x.clinic_id = p.id and x.status in ('ready', 'flagged')) < (select w from monday) then 'BEHIND'
    else 'ok'
  end as delivery
from paying p
order by delivery desc, last_delivered_week nulls first;

-- 2. Paying clinics whose paid period ended more than 3 days ago with no renewal recorded
--    (the nightly reconcile pauses these; a row here means it has not run).
select id, profile ->> 'name' as name, plan_renews_at
from public.dentvid_clinics
where plan = 'active' and plan_renews_at < now() - interval '3 days'
order by plan_renews_at;

-- 3. Thin weeks in the last 4 weeks: fewer than 5 usable videos for a paying clinic.
select i.clinic_id, i.week_of,
  count(*) filter (where i.status in ('ready', 'flagged')) as usable,
  count(*) filter (where i.status not in ('ready', 'flagged')) as not_usable
from public.dentvid_items i
join public.dentvid_clinics c on c.id = i.clinic_id and c.plan = 'active'
where i.kind = 'generated' and i.week_of >= (date_trunc('week', now() at time zone 'utc'))::date - 28
group by i.clinic_id, i.week_of
having count(*) filter (where i.status in ('ready', 'flagged')) < 5
order by i.week_of desc, usable;

rollback;
