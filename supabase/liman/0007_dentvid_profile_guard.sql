-- ============================================================
-- DentVideo: profile guard, approval guard, subscription ledger (Liman).
-- NOT applied automatically. Apply by hand after 0001–0006 (Liman SQL editor
-- or psql), then run the checks at the bottom. Idempotent; safe to run twice.
-- The app and the worker keep working before it is applied (they detect the
-- missing tables and fall back to the old behaviour).
--
-- 1. dentvid_clinics.profile — the owner's update policy (0001) covers the
--    whole row and owners hold the anon key + their JWT, so they can write
--    profile through PostgREST directly. The worker reads that jsonb, so an
--    owner write is checked here, server-side, against the same shape the
--    app's API route validates (web/src/lib/dentvid/profile.ts):
--      allowed keys only (no "logo", no URLs or paths the worker could
--      follow), string lengths, enums, https-only booking link.
--    A rejected write raises check_violation (23514). Service-role writes
--    (worker, webhook) are untouched. Unchanged profiles are not re-checked,
--    so rows saved before this migration keep working until they are edited.
--
-- 2. dentvid_items.approval — owners may only decide on videos that exist
--    (status ready / flagged). On any other status the decision is reverted.
--
-- 3. dentvid_subscriptions — every Dodo subscription seen for a clinic, with
--    the last event applied (timestamp + type), so late or out-of-order
--    webhooks never undo newer state, a second (duplicate) subscription is
--    recorded rather than overwriting the first, and founding seats are
--    counted from what was actually bought.
--
-- 4. dentvid_payments — Dodo payment id → clinic, so refund / dispute events
--    (which carry no metadata) can be matched to a DentVideo clinic.
--
-- Tables 3 and 4 are service-role only (RLS on, no policies, grants revoked).
-- ============================================================

-- 1. Profile shape for owner writes ----------------------------------------
create or replace function public.dentvid_plain_text(s text, min_len int, max_len int)
returns boolean
language sql
immutable
as $$
  select s is not null
     and char_length(s) between min_len and max_len
     and s !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]'
     and s !~* '(://|^\s*(file|data|javascript):|^\s*[/~\\]|\.\.[/\\])';
$$;

create or replace function public.dentvid_profile_ok(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  s jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('name', 'city', 'country', 'language', 'services', 'tone', 'address', 'handle', 'bookingUrl', 'brandColor') then
      return false;
    end if;
  end loop;

  if coalesce(jsonb_typeof(p -> 'name'), '') <> 'string' or not public.dentvid_plain_text(p ->> 'name', 1, 80) then
    return false;
  end if;
  if p ? 'city' and (coalesce(jsonb_typeof(p -> 'city'), '') <> 'string' or not public.dentvid_plain_text(p ->> 'city', 0, 60)) then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'country'), '') <> 'string' or (p ->> 'country') !~ '^[A-Za-z]{2}$' then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'language'), '') <> 'string'
     or (p ->> 'language') not in ('en', 'de', 'es', 'fr', 'it', 'pt', 'tr', 'ja', 'ar', 'pl') then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'services'), '') <> 'array' or jsonb_array_length(p -> 'services') not between 1 and 20 then
    return false;
  end if;
  for s in select jsonb_array_elements(p -> 'services') loop
    if jsonb_typeof(s) <> 'string' or not public.dentvid_plain_text(s #>> '{}', 2, 60) then
      return false;
    end if;
  end loop;
  if p ? 'tone' and (coalesce(jsonb_typeof(p -> 'tone'), '') <> 'string' or (p ->> 'tone') not in ('warm', 'expert', 'playful', 'calm')) then
    return false;
  end if;
  if p ? 'address' and (coalesce(jsonb_typeof(p -> 'address'), '') <> 'string' or (p ->> 'address') not in ('formal', 'informal')) then
    return false;
  end if;
  if p ? 'handle' and (coalesce(jsonb_typeof(p -> 'handle'), '') <> 'string' or (p ->> 'handle') !~ '^[A-Za-z0-9._-]{1,40}$') then
    return false;
  end if;
  if p ? 'bookingUrl' and (coalesce(jsonb_typeof(p -> 'bookingUrl'), '') <> 'string'
     or char_length(p ->> 'bookingUrl') > 298
     or (p ->> 'bookingUrl') !~* '^https://[^[:space:]"''<>\\]{3,}$') then
    return false;
  end if;
  if p ? 'brandColor' and (coalesce(jsonb_typeof(p -> 'brandColor'), '') <> 'string' or (p ->> 'brandColor') !~ '^#?[0-9A-Fa-f]{6}$') then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.dentvid_clinics_guard_profile()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' and new.profile is not distinct from old.profile then
      return new;
    end if;
    if not public.dentvid_profile_ok(new.profile) then
      raise exception 'dentvid: clinic profile rejected (unknown key or invalid value)' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_profile on public.dentvid_clinics;
create trigger dentvid_clinics_guard_profile
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_profile();

-- 2. Approval only on finished videos -----------------------------------------
create or replace function public.dentvid_items_guard_approval()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and (new.approval is distinct from old.approval or new.approval_note is distinct from old.approval_note)
     and old.status not in ('ready', 'flagged') then
    new.approval := old.approval;
    new.approval_note := old.approval_note;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_items_guard_approval on public.dentvid_items;
create trigger dentvid_items_guard_approval
  before update on public.dentvid_items
  for each row execute function public.dentvid_items_guard_approval();

-- 3. Subscription ledger --------------------------------------------------------
create table if not exists public.dentvid_subscriptions (
  dodo_subscription_id text primary key,
  clinic_id        uuid not null references public.dentvid_clinics(id) on delete cascade,
  -- Dodo's status as last applied: pending (paid, not active yet), active,
  -- on_hold, paused, cancelled, expired, failed, lapsed (our reconciliation).
  status           text not null,
  product          text,
  tier             text check (tier is null or tier in ('starter', 'practice', 'group')),
  interval         text check (interval is null or interval in ('month', 'year')),
  discount_id      text,
  founding         boolean not null default false,
  period_end       timestamptz,
  last_event_at    timestamptz,
  last_event_type  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists dentvid_subscriptions_clinic on public.dentvid_subscriptions (clinic_id, updated_at desc);
create index if not exists dentvid_subscriptions_founding on public.dentvid_subscriptions (clinic_id) where founding;

alter table public.dentvid_subscriptions enable row level security;
revoke all on public.dentvid_subscriptions from anon, authenticated;

comment on table public.dentvid_subscriptions is 'DentVideo: every Dodo subscription seen per clinic, with the last webhook applied (ordering, duplicates, founding seats). Service role only.';

-- 4. Payments → clinic (refunds and disputes carry only a payment id) --------
create table if not exists public.dentvid_payments (
  dodo_payment_id      text primary key,
  clinic_id            uuid not null references public.dentvid_clinics(id) on delete cascade,
  dodo_subscription_id text,
  created_at           timestamptz not null default now()
);

create index if not exists dentvid_payments_clinic on public.dentvid_payments (clinic_id, created_at desc);

alter table public.dentvid_payments enable row level security;
revoke all on public.dentvid_payments from anon, authenticated;

comment on table public.dentvid_payments is 'DentVideo: Dodo payment ids per clinic, to match refund/dispute webhooks. Service role only.';

-- Checks (run after applying) -------------------------------------------------
-- select public.dentvid_profile_ok('{"name":"A","country":"TR","language":"tr","services":["Implant"],"logo":"/etc/passwd"}'::jsonb);  -- f
-- select public.dentvid_profile_ok('{"name":"Gülüş","country":"TR","language":"tr","services":["İmplant"],"tone":"warm","address":"formal","bookingUrl":"https://x.example/b"}'::jsonb);  -- t
-- select tgname from pg_trigger where tgrelid in ('public.dentvid_items'::regclass, 'public.dentvid_clinics'::regclass) and not tgisinternal;
-- select relname, relrowsecurity from pg_class where relname in ('dentvid_subscriptions', 'dentvid_payments');  -- t, t
-- select count(*) from pg_policies where tablename in ('dentvid_subscriptions', 'dentvid_payments');            -- 0
