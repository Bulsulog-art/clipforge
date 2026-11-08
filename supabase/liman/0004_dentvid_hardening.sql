-- ============================================================
-- DentVideo hardening on Liman — NOT applied automatically.
-- Requires 0003 (suggested_backgrounds). Apply by hand after 0001–0003 (Liman SQL editor or psql), then run the
-- checks at the bottom. Idempotent; safe to run twice. See docs/SECURITY.md.
--
-- 1. Storage bucket "dentvid": a hard size cap and a MIME allow-list, so a
--    signed-in clinic cannot fill the VPS disk through the browser upload
--    (the 500 MB check in record-upload.tsx is client-side only).
-- 2. dentvid_items: the owner's update policy covers the whole row, and the
--    owner holds the anon key + their JWT, so they can call PostgREST
--    directly. A trigger limits what an owner can change to the decision
--    (approval / approval_note), the photo choice (plan.backgrounds only)
--    and the restyle flags. Without it an owner could rewrite the narration
--    (unreviewed text through TTS), or point video_path at another clinic's
--    file, which the worker's restyle job then deletes with the service role.
-- 3. dentvid_clinics.logo_path: only "<owner>/logo.<ext>" may be set by the
--    owner — the worker downloads it with the service role.
--
-- Service-role writes (worker, webhook) are untouched: auth.role() is
-- 'service_role' there.
-- ============================================================

-- 1. Bucket limits ----------------------------------------------------------
-- 500 MB per object (matches the app's MAX_MB). Liman's storage service also
-- has a global FILE_SIZE_LIMIT env (default 50 MB on self-hosted Supabase);
-- the lower of the two applies.
update storage.buckets
   set file_size_limit = 524288000,
       allowed_mime_types = array[
         'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
         'image/png', 'image/jpeg', 'image/webp'
       ]
 where id = 'dentvid';

-- 2. Items: owners change only their decision and photo choice --------------
create or replace function public.dentvid_items_guard_owner()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    new.id          := old.id;
    new.clinic_id   := old.clinic_id;
    new.owner_id    := old.owner_id;
    new.kind        := old.kind;
    new.week_of     := old.week_of;
    new.status      := old.status;
    new.title       := old.title;
    new.topic       := old.topic;
    new.copy        := old.copy;
    new.spoken      := old.spoken;
    new.checks      := old.checks;
    new.findings    := old.findings;
    new.shoot_card  := old.shoot_card;
    new.qa          := old.qa;
    new.video_path  := old.video_path;
    new.thumb_path  := old.thumb_path;
    new.source_path := old.source_path;
    new.error       := old.error;
    new.created_at  := old.created_at;
    new.suggested_backgrounds := old.suggested_backgrounds;
    -- The stored plan keeps everything it had; only the photo list may move,
    -- and only to 1–4 library paths (same rule as the worker's scene-plan.ts).
    if old.plan is null then
      new.plan := null;
    elsif new.plan is distinct from old.plan then
      if jsonb_typeof(new.plan -> 'backgrounds') = 'array'
         and jsonb_array_length(new.plan -> 'backgrounds') between 1 and 4
         and not exists (
           select 1 from jsonb_array_elements(new.plan -> 'backgrounds') b
            where jsonb_typeof(b) <> 'string'
               or (b #>> '{}') !~ '^/dentvideo/backgrounds/[a-z]+-[0-9]{2}\.jpg$'
         )
      then
        new.plan := jsonb_set(old.plan, '{backgrounds}', new.plan -> 'backgrounds');
      else
        new.plan := old.plan;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_items_guard_owner on public.dentvid_items;
create trigger dentvid_items_guard_owner
  before update on public.dentvid_items
  for each row execute function public.dentvid_items_guard_owner();

-- 3. Clinics: the logo path stays in the owner's folder -----------------------
create or replace function public.dentvid_clinics_guard_paths()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if new.logo_path is not null
       and new.logo_path !~ ('^' || new.owner_id::text || '/logo\.[a-z0-9_+-]{1,4}$') then
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

-- Checks (run after applying) -------------------------------------------------
-- select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'dentvid';
-- select tgname from pg_trigger where tgrelid in ('public.dentvid_items'::regclass, 'public.dentvid_clinics'::regclass) and not tgisinternal;
-- select policyname, cmd from pg_policies where tablename in ('dentvid_items', 'dentvid_clinics');
