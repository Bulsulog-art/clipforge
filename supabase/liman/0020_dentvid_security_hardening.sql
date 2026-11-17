-- ============================================================
-- DentVideo security hardening (audit 2026-11-15) — NOT applied automatically.
-- Requires 0008 and 0013. Apply by hand (Liman SQL editor or psql) after the
-- web deploy that adds POST /api/dentvideo/logo, then run the checks at the
-- bottom. Idempotent; safe to run twice. Changes no data.
--
-- 1. Logos are at most 5 MB in the storage insert policy too (audit H-1).
--    The 'dentvid' bucket's limit is 500 MB (recordings, 0004), and the
--    0008 insert policy checks the owner's quota against what is ALREADY
--    stored. A signed-in DentVideo account could therefore upload a "logo"
--    of up to 500 MB straight to Liman with its own JWT (the browser's
--    fallback path), and several at once — each upload passes the quota
--    check before any of them has landed. The web app now sends logos
--    through POST /api/dentvideo/logo (bytes read and capped by the server)
--    and no longer signs logo upload URLs; this closes the direct path:
--    a logo row whose recorded size is over 5 MB fails the policy.
--
--    storage-api checks the insert policy before the upload (no size known
--    yet: metadata is null, so the check passes as before) and again when it
--    writes the object row with its metadata (size known: an oversized logo
--    is refused and the upload fails). VERIFY ON A STAGING LIMAN that an
--    oversized direct upload is refused AND that its file is not left on
--    disk (storage-api deletes the object when the row cannot be written);
--    see the checks below. Recordings keep the bucket's 500 MB.
--
-- 2. approval_note is bounded in the database (audit L-3). The app accepts
--    500 characters; the owner's update policy covers the column and the
--    0004/0007 triggers keep its content, not its length, so a direct
--    PostgREST write could store megabytes per video (the admin panel and
--    the GDPR export read it back). 2000 leaves room for any client.
--
-- Service-role access (web server, worker, webhook) is unchanged.
-- ============================================================

-- 1. Logo size in the storage insert policy ------------------------------------

drop policy if exists "dentvid storage member insert" on storage.objects;

create policy "dentvid storage member insert" on storage.objects for insert
  with check (
    bucket_id = 'dentvid'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select public.dentvid_is_member(auth.uid()))
    and (
      (
        name ~ ('^' || auth.uid()::text || '/logo(-[0-9]{10,16})?\.(png|jpg|jpeg|webp)$')
        -- LOGO_MAX_BYTES (web/src/lib/dentvid/storage-quota.ts). Null while storage-api only tests the permission.
        and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
      )
      or (
        name ~ ('^' || auth.uid()::text || '/recordings/[0-9]{10,16}\.(mp4|mov|webm|m4v)$')
        and (select public.dentvid_can_record(auth.uid()))
      )
    )
    and public.dentvid_storage_within_quota(auth.uid())
  );

-- 2. approval_note length -------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dentvid_items_approval_note_len' and conrelid = 'public.dentvid_items'::regclass) then
    -- NOT VALID first: no table scan under lock; validated right after (existing notes are ≤ 500).
    alter table public.dentvid_items
      add constraint dentvid_items_approval_note_len check (approval_note is null or length(approval_note) <= 2000) not valid;
  end if;
end $$;

alter table public.dentvid_items validate constraint dentvid_items_approval_note_len;

-- Checks (run after applying) -------------------------------------------------
-- select policyname, with_check from pg_policies where tablename = 'objects' and policyname = 'dentvid storage member insert';
--   → the logo branch carries "(metadata ->> 'size')"
-- select conname, convalidated from pg_constraint where conname = 'dentvid_items_approval_note_len';   → t
-- Oversized logos already stored (must be 0; storage-cleanup removes them otherwise):
-- select count(*) from storage.objects
--  where bucket_id = 'dentvid' and name ~ '/logo(-[0-9]+)?\.[a-z]+$' and coalesce((metadata->>'size')::bigint, 0) > 5242880;
-- Staging only — as a signed-in DentVideo test user, upload a 6 MB PNG directly:
--   supabase.storage.from('dentvid').upload('<uid>/logo-1731081600000.png', sixMbBlob, { contentType: 'image/png' })
--   → must fail with a row-level security error, and the count above must stay 0
--     (and no file under <uid>/ on the storage volume).
--   A 200 KB PNG the same way must still succeed.
