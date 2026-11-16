-- ============================================================
-- DentVideo iPhone app: push device tokens (Liman). Additive only.
-- NOT applied automatically. Apply by hand after 0022 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
--
-- dentvid_devices: one row per iPhone that signed in to the DentVideo app and
-- allowed notifications. Written ONLY by the API (POST/DELETE
-- /api/dentvideo/mobile/v1/devices, sign-out) with the service role, always
-- with owner_id = the bearer session's user id; read by the "ready" notice
-- (/api/internal/dentvideo/notify) to send the Monday push.
--
-- Owners may read their own rows (RLS); there is no insert/update/delete
-- policy, so a direct REST write with a user token is refused. Rows go with
-- the login (on delete cascade), so account deletion removes them too.
--
-- Until this is applied the app still works: device registration answers
-- { ok: true, stored: false } and no push is sent (the email still goes).
-- ============================================================

create table if not exists public.dentvid_devices (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  -- APNs device token: 64–200 hex characters (Apple has used 64 so far).
  token         text not null unique check (token ~ '^[0-9a-f]{64,200}$'),
  platform      text not null default 'ios' check (platform in ('ios')),
  -- 'production' (TestFlight / App Store) or 'development' (Xcode builds): which APNs host to use.
  environment   text not null default 'production' check (environment in ('production', 'development')),
  locale        text check (locale is null or locale ~ '^[a-z]{2}$'),
  -- The "Your week is ready" push for this device (Settings in the app).
  ready_push    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dentvid_devices_owner_idx on public.dentvid_devices (owner_id);

alter table public.dentvid_devices enable row level security;

drop policy if exists "dentvid device self read" on public.dentvid_devices;
create policy "dentvid device self read" on public.dentvid_devices for select using (auth.uid() = owner_id);

comment on table public.dentvid_devices is
  'DentVideo iPhone app: APNs tokens per owner. Written only by the API with the service role (owner_id from the session).';

-- Checks ---------------------------------------------------------------------
-- select relrowsecurity from pg_class where relname = 'dentvid_devices';                 -- t
-- select polname, polcmd from pg_policy where polrelid = 'public.dentvid_devices'::regclass; -- one row: r (select)
-- select count(*) from public.dentvid_devices;                                            -- 0 right after applying
