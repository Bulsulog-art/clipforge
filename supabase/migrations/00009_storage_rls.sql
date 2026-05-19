-- 00009_storage_rls.sql — explicit storage.objects policies
--
-- Until now the storage buckets were created in the dashboard and policies
-- (if any) lived there too, which means they weren't reproducible from the
-- repo. This migration writes them down: every user-owned object MUST live
-- under a path prefix matching the owner's UUID, and only that owner can
-- read / insert / delete it via the anon role. The worker keeps full access
-- via service_role (which bypasses RLS).
--
-- Path convention enforced by the iOS client and the worker:
--   <bucket>/<user_uuid>/<resource>/<filename>
-- The first path segment is always the owner's UUID.
--
-- Public-read buckets (avatars catalog, music tracks) skip the
-- per-object policy — they're catalog data, public by design.

-- Idempotent setup: only run when storage schema is present (it always is on
-- Supabase, but local fixtures sometimes start without it).
do $$
begin
  if not exists (
    select 1 from information_schema.schemata where schema_name = 'storage'
  ) then
    raise notice 'storage schema missing; skipping storage RLS migration';
    return;
  end if;
end$$;

-- Make sure RLS is on (Supabase default is on, but be explicit).
alter table if exists storage.objects enable row level security;

-- Helper: pull the first path segment out of object name.
create or replace function public.clipforge_owner_prefix(object_name text)
returns text language sql immutable as $$
  select split_part(object_name, '/', 1)
$$;

-- Bucket-specific writable buckets: name → policy_tag
do $$
declare
  bkt text;
  bucket_list text[] := array[
    'clipforge-uploads',          -- user uploads (face refs, custom avatar images)
    'clipforge-videos-raw',       -- raw downloads from yt-dlp
    'clipforge-videos-rendered',  -- final clips
    'clipforge-thumbnails',       -- generated thumbnails
    'clipforge-faces'             -- detected face refs
  ];
begin
  foreach bkt in array bucket_list loop
    -- read
    execute format($pol$
      drop policy if exists "owner select %I" on storage.objects;
      create policy "owner select %I"
        on storage.objects for select to authenticated
        using (bucket_id = %L
               and public.clipforge_owner_prefix(name) = auth.uid()::text);
    $pol$, bkt, bkt, bkt);
    -- insert
    execute format($pol$
      drop policy if exists "owner insert %I" on storage.objects;
      create policy "owner insert %I"
        on storage.objects for insert to authenticated
        with check (bucket_id = %L
                    and public.clipforge_owner_prefix(name) = auth.uid()::text);
    $pol$, bkt, bkt, bkt);
    -- update (rename / metadata)
    execute format($pol$
      drop policy if exists "owner update %I" on storage.objects;
      create policy "owner update %I"
        on storage.objects for update to authenticated
        using (bucket_id = %L
               and public.clipforge_owner_prefix(name) = auth.uid()::text)
        with check (bucket_id = %L
                    and public.clipforge_owner_prefix(name) = auth.uid()::text);
    $pol$, bkt, bkt, bkt, bkt);
    -- delete
    execute format($pol$
      drop policy if exists "owner delete %I" on storage.objects;
      create policy "owner delete %I"
        on storage.objects for delete to authenticated
        using (bucket_id = %L
               and public.clipforge_owner_prefix(name) = auth.uid()::text);
    $pol$, bkt, bkt, bkt);
  end loop;
end$$;

-- Public-read buckets: keep the existing default-open select but add a guard
-- to make sure no anon/authenticated user can write into them.
do $$
declare
  bkt text;
  public_buckets text[] := array['clipforge-avatars', 'clipforge-music'];
begin
  foreach bkt in array public_buckets loop
    execute format($pol$
      drop policy if exists "public read %I" on storage.objects;
      create policy "public read %I"
        on storage.objects for select
        using (bucket_id = %L);
    $pol$, bkt, bkt, bkt);
    -- explicit deny for non-service writes is implicit when no policy
    -- grants insert/update/delete to anon or authenticated; service_role
    -- still bypasses RLS for upload.
  end loop;
end$$;
