-- ============================================================
-- DentVideo on shared Liman: members only, versioned logos, storage quota
-- NOT applied automatically. Requires 0001–0006 (0007 is independent).
-- Apply by hand (Liman SQL editor or psql) AFTER:
--   1. the web deploy that writes app_metadata (this branch), and
--   2. scripts/dentvideo-backfill-app-metadata.mts --apply
--      (accounts made before the deploy carry the DentVideo marker only in
--      user_metadata; without the backfill this migration locks them out).
-- Idempotent; safe to run twice. See docs/SECURITY.md (audit H2–H5).
--
-- 1. Membership (H5a). Liman hosts ~8 apps and their users share auth.users.
--    The DentVideo tables and the "dentvid" bucket were open to ANY signed-in
--    Liman user (RLS checked only auth.uid() = owner_id), so another app's
--    user could create a DentVideo clinic. Every owner policy now also needs
--    app_metadata.product = "dentvideo" (or "dentvideo" in
--    app_metadata.products). app_metadata is written only by the service
--    role (/api/dentvideo/signup); user_metadata, which the user can edit
--    themselves, is never trusted. The check reads auth.users (security
--    definer), not the JWT, so it holds immediately for sessions issued
--    before the backfill.
-- 2. Versioned logos (H3). "<uid>/logo.<ext>" was re-uploaded with upsert,
--    but the bucket has no UPDATE policy, so replacing a logo failed. The app
--    now uploads "<uid>/logo-<epoch ms>.<ext>"; the path guard accepts both
--    (old rows keep their legacy name). The server deletes the old file.
-- 3. Storage inserts (H4). The owner may insert only:
--      - a logo: "<uid>/logo[-<digits>].(png|jpg|jpeg|webp)", any member;
--      - a recording: "<uid>/recordings/<digits>.(mp4|mov|webm|m4v)", only
--        while the clinic is active on a plan with recordings (not Starter);
--    and only under a per-owner quota (files and bytes over everything in
--    the folder): unpaid 20 files / 50 MB, active 3000 files / 25 GB — the
--    same numbers as web/src/lib/dentvid/storage-quota.ts. The app uploads
--    through signed URLs issued by /api/dentvideo/upload-url after the same
--    checks; this policy covers direct calls to the Storage API.
--    Reads stay limited to the owner's folder, members only.
--
-- Service-role access (web server, worker) is unaffected: it bypasses RLS.
-- ============================================================

-- 1. Membership -------------------------------------------------------------
create or replace function public.dentvid_is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where u.id = uid
       and (u.raw_app_meta_data ->> 'product' = 'dentvideo'
            or coalesce(u.raw_app_meta_data -> 'products', '[]'::jsonb) ? 'dentvideo')
  );
$$;
revoke all on function public.dentvid_is_member(uuid) from public;
grant execute on function public.dentvid_is_member(uuid) to authenticated, service_role;

-- (select …) lets Postgres evaluate the check once per statement, not per row.
drop policy if exists "dentvid clinic self read"   on public.dentvid_clinics;
drop policy if exists "dentvid clinic self insert" on public.dentvid_clinics;
drop policy if exists "dentvid clinic self update" on public.dentvid_clinics;
create policy "dentvid clinic self read" on public.dentvid_clinics for select
  using (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())));
create policy "dentvid clinic self insert" on public.dentvid_clinics for insert
  with check (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())));
create policy "dentvid clinic self update" on public.dentvid_clinics for update
  using (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())))
  with check (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())));

drop policy if exists "dentvid item self read"    on public.dentvid_items;
drop policy if exists "dentvid item self approve" on public.dentvid_items;
create policy "dentvid item self read" on public.dentvid_items for select
  using (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())));
create policy "dentvid item self approve" on public.dentvid_items for update
  using (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())))
  with check (auth.uid() = owner_id and (select public.dentvid_is_member(auth.uid())));

-- 2. Logo path guard (replaces 0004's) -----------------------------------------
create or replace function public.dentvid_clinics_guard_paths()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if new.logo_path is not null
       and new.logo_path !~ ('^' || new.owner_id::text || '/logo(-[0-9]{10,16})?\.[a-z0-9_+-]{1,4}$') then
      new.logo_path := case when tg_op = 'UPDATE' then old.logo_path else null end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_paths on public.dentvid_clinics;
create trigger dentvid_clinics_guard_paths
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_paths();

-- 3. Storage: what an owner may insert, and how much ----------------------------
create or replace function public.dentvid_can_record(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

revoke all on function public.dentvid_can_record(uuid) from public;
revoke all on function public.dentvid_storage_within_quota(uuid) from public;
grant execute on function public.dentvid_can_record(uuid) to authenticated, service_role;
grant execute on function public.dentvid_storage_within_quota(uuid) to authenticated, service_role;

drop policy if exists "dentvid storage own folder read"  on storage.objects;
drop policy if exists "dentvid storage own folder write" on storage.objects;
drop policy if exists "dentvid storage member insert"    on storage.objects;

create policy "dentvid storage own folder read" on storage.objects for select
  using (
    bucket_id = 'dentvid'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select public.dentvid_is_member(auth.uid()))
  );

create policy "dentvid storage member insert" on storage.objects for insert
  with check (
    bucket_id = 'dentvid'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select public.dentvid_is_member(auth.uid()))
    and (
      name ~ ('^' || auth.uid()::text || '/logo(-[0-9]{10,16})?\.(png|jpg|jpeg|webp)$')
      or (
        name ~ ('^' || auth.uid()::text || '/recordings/[0-9]{10,16}\.(mp4|mov|webm|m4v)$')
        and (select public.dentvid_can_record(auth.uid()))
      )
    )
    and public.dentvid_storage_within_quota(auth.uid())
  );

-- No UPDATE or DELETE policy for owners: logos are versioned (no overwrite)
-- and old files are removed by the server with the service role.

-- Checks (run after applying) -------------------------------------------------
-- select policyname, cmd from pg_policies where tablename in ('dentvid_items', 'dentvid_clinics', 'objects') and policyname like 'dentvid%';
-- select public.dentvid_is_member('<a DentVideo user id>');     -- true after the backfill
-- select public.dentvid_is_member('<another app''s user id>');  -- false
-- select public.dentvid_storage_within_quota('<a DentVideo user id>');
-- Owners who would be locked out (must be empty, or reviewed, before applying):
-- select c.owner_id from public.dentvid_clinics c where not public.dentvid_is_member(c.owner_id);
