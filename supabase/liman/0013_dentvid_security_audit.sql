-- ============================================================
-- DentVideo security audit fixes on Liman — NOT applied automatically.
-- Requires 0001–0011 (0012, the posted-at column, is independent). Apply by hand (Liman SQL editor or psql), then run the
-- checks at the bottom. Idempotent; safe to run twice. Nothing here changes
-- data; it changes three helper functions, adds one trigger and narrows grants.
--
-- 1. Membership / plan / quota helpers answer only for the caller (audit M1).
--    dentvid_is_member, dentvid_can_record and dentvid_storage_within_quota
--    (0008) are SECURITY DEFINER and take any user id. 0008 revoked EXECUTE
--    from PUBLIC, but Supabase grants EXECUTE on new public functions to anon
--    and authenticated explicitly, so on Liman anyone holding the public anon
--    key could call them through PostgREST:
--      POST /rest/v1/rpc/dentvid_is_member      {"uid": "<any user id>"}  → is it a DentVideo account?
--      POST /rest/v1/rpc/dentvid_can_record     {"uid": …}               → is it a paying Practice clinic?
--      POST /rest/v1/rpc/dentvid_storage_within_quota {"uid": …}         → a scan of storage.objects per call
--    (verified live 2026-11-13 with the anon key: 200 true/false).
--    Liman is shared with other apps, so that is a cross-app oracle on user
--    ids and an unauthenticated way to make the database scan storage.objects.
--    Now: EXECUTE for authenticated and service_role only, and for a signed-in
--    user the functions answer about that user alone (any other id → false).
--    The storage and table policies always pass auth.uid(), so they behave
--    exactly as before.
--
-- 2. Clinic identity columns stay the server's (audit L1). The owner's update
--    policy (0001/0008) covers the whole row, so through PostgREST an owner
--    could rewrite created_at (the lifecycle emails and the admin panel's
--    cohorts read it) and, before anything references the row, its id.
--    A trigger keeps id, owner_id and created_at for owner writes; an owner's
--    insert gets a fresh id and created_at = now().
--
-- 3. Grants (audit L2). anon held every privilege on dentvid_clinics and
--    dentvid_items (RLS made them useless, but TRUNCATE, TRIGGER and REFERENCES
--    are not covered by RLS at all). anon now has none; authenticated keeps
--    only what its policies use: clinics SELECT/INSERT/UPDATE (the clinic save
--    is an upsert), items SELECT/UPDATE (the decision and photo choice).
--
-- Service-role access (web server, worker, webhook) is unchanged.
-- ============================================================

-- 1. Helpers answer only for the caller ---------------------------------------
create or replace function public.dentvid_is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (uid = auth.uid() or coalesce(auth.role(), '') = 'service_role')
     and exists (
       select 1 from auth.users u
        where u.id = uid
          and (u.raw_app_meta_data ->> 'product' = 'dentvideo'
               or coalesce(u.raw_app_meta_data -> 'products', '[]'::jsonb) ? 'dentvideo')
     );
$$;

create or replace function public.dentvid_can_record(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (uid = auth.uid() or coalesce(auth.role(), '') = 'service_role')
     and exists (
       select 1 from public.dentvid_clinics c
        where c.owner_id = uid
          and c.plan = 'active'
          and coalesce(c.plan_tier, '') <> 'starter'
     );
$$;

create or replace function public.dentvid_storage_within_quota(uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n_files bigint;
  n_bytes bigint;
  active  boolean;
begin
  if uid is null or (uid is distinct from auth.uid() and coalesce(auth.role(), '') <> 'service_role') then
    return false;
  end if;
  select count(*), coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
    into n_files, n_bytes
    from storage.objects o
   where o.bucket_id = 'dentvid'
     and o.name like uid::text || '/%';
  select exists (select 1 from public.dentvid_clinics c where c.owner_id = uid and c.plan = 'active') into active;
  if active then
    return n_files < 3000 and n_bytes < 25::bigint * 1024 * 1024 * 1024;
  end if;
  return n_files < 20 and n_bytes < 50::bigint * 1024 * 1024;
end;
$$;

revoke all on function public.dentvid_is_member(uuid) from public, anon;
revoke all on function public.dentvid_can_record(uuid) from public, anon;
revoke all on function public.dentvid_storage_within_quota(uuid) from public, anon;
grant execute on function public.dentvid_is_member(uuid) to authenticated, service_role;
grant execute on function public.dentvid_can_record(uuid) to authenticated, service_role;
grant execute on function public.dentvid_storage_within_quota(uuid) to authenticated, service_role;

-- 2. Clinic identity columns ---------------------------------------------------
create or replace function public.dentvid_clinics_guard_identity()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.id := gen_random_uuid();
      new.created_at := now();
    else
      new.id := old.id;
      new.owner_id := old.owner_id;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_identity on public.dentvid_clinics;
create trigger dentvid_clinics_guard_identity
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_identity();

-- 3. Grants ---------------------------------------------------------------------
revoke all on public.dentvid_clinics from anon;
revoke all on public.dentvid_items from anon;
revoke truncate, references, trigger, delete on public.dentvid_clinics from authenticated;
revoke truncate, references, trigger, delete, insert on public.dentvid_items from authenticated;

-- Checks (run after applying) -------------------------------------------------
-- select has_function_privilege('anon', 'public.dentvid_is_member(uuid)', 'execute');              -- f
-- select has_function_privilege('anon', 'public.dentvid_storage_within_quota(uuid)', 'execute');   -- f
-- select has_function_privilege('authenticated', 'public.dentvid_is_member(uuid)', 'execute');     -- t
-- curl -X POST https://liman.bulsulabs.com/rest/v1/rpc/dentvid_is_member -H "apikey: <anon key>" \
--      -H 'content-type: application/json' -d '{"uid":"<a DentVideo user id>"}'                  -- 401/permission denied
-- select grantee, string_agg(privilege_type, ',') from information_schema.role_table_grants
--  where table_name in ('dentvid_clinics', 'dentvid_items') and grantee in ('anon', 'authenticated')
--  group by table_name, grantee;  -- clinics: authenticated INSERT,SELECT,UPDATE; items: authenticated SELECT,UPDATE; no anon rows
-- select tgname from pg_trigger where tgrelid = 'public.dentvid_clinics'::regclass and tgname = 'dentvid_clinics_guard_identity';
-- Then, as a real clinic: save the clinic form, upload a logo, and (Practice) upload a recording — all still work.
