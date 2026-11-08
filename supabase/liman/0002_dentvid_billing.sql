-- ============================================================
-- DentVideo billing on Liman — additive only.
--
-- dentvid_clinics.plan (trial / active / paused / cancelled) already exists.
-- This adds what the Dodo Payments webhook records next to it:
--   plan_tier            starter | practice | group (null while on trial)
--   dodo_subscription_id the Dodo subscription that pays for the clinic
--   plan_renews_at       Dodo's next_billing_date (end of the paid period)
--
-- Billing columns are written only by the service role (the webhook). The
-- owner's own update policy covers the whole row, so a trigger keeps an
-- owner (anon / authenticated) from granting themselves a plan through the
-- REST API: their changes to these columns are silently reverted.
-- ============================================================

alter table public.dentvid_clinics add column if not exists plan_tier text;
alter table public.dentvid_clinics add column if not exists dodo_subscription_id text;
alter table public.dentvid_clinics add column if not exists plan_renews_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_plan_tier_check') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_plan_tier_check check (plan_tier is null or plan_tier in ('starter', 'practice', 'group'));
  end if;
end $$;

create index if not exists dentvid_clinics_dodo_subscription on public.dentvid_clinics (dodo_subscription_id)
  where dodo_subscription_id is not null;

create or replace function public.dentvid_clinics_guard_billing()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.plan := 'trial';
      new.plan_tier := null;
      new.dodo_subscription_id := null;
      new.plan_renews_at := null;
    else
      new.plan := old.plan;
      new.plan_tier := old.plan_tier;
      new.dodo_subscription_id := old.dodo_subscription_id;
      new.plan_renews_at := old.plan_renews_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_billing on public.dentvid_clinics;
create trigger dentvid_clinics_guard_billing
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_billing();

comment on column public.dentvid_clinics.plan_tier is 'DentVideo plan tier paid for (starter/practice/group); set by the Dodo webhook.';
comment on column public.dentvid_clinics.dodo_subscription_id is 'Dodo Payments subscription id for this clinic; set by the Dodo webhook.';
comment on column public.dentvid_clinics.plan_renews_at is 'End of the current paid period (Dodo next_billing_date).';
