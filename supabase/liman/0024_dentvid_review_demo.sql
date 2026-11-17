-- ============================================================
-- DentVideo: the App Review demo clinic gets no automatic weeks (Liman). Additive only.
-- NOT applied automatically. Apply by hand after 0023 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
--
-- App Store review needs a clinic with an active plan and a finished week
-- (docs/APP_STORE_DENTVIDEO.md §1.5). Its plan is set by hand, without a
-- payment, so nothing pays for the Monday batch: without this flag the worker
-- would make five new videos for it every week (OpenAI + TTS spend).
--
-- review_demo = true:
--   * the Saturday dispatch, the dispatch watchdog and the Monday delivery
--     watchdog leave the clinic out (worker/src/dentvid/schedule.ts getsWeeks);
--   * a "week" job queued for it any other way (web button, top-up after a
--     decline) makes nothing (worker/src/dentvid/jobs.ts paying);
--   * the reviewer's own recording is still processed, so the app's
--     recording flow works end to end.
--
-- Only the service role / postgres can set it: the admin guard keeps the old
-- value for anon and authenticated, like admin_paused_at.
-- ============================================================

alter table public.dentvid_clinics add column if not exists review_demo boolean not null default false;

create or replace function public.dentvid_clinics_guard_admin()
 returns trigger
 language plpgsql
as $function$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.admin_paused_at := null;
      new.admin_pause_note := null;
      new.review_demo := false;
    else
      new.admin_paused_at := old.admin_paused_at;
      new.admin_pause_note := old.admin_pause_note;
      new.review_demo := old.review_demo;
    end if;
  end if;
  return new;
end;
$function$;

-- ------------------------------------------------------------
-- Checks (run after applying):
--   select count(*) from public.dentvid_clinics where review_demo;          -- 0 until the demo clinic is flagged
--   select column_default, is_nullable from information_schema.columns
--    where table_name = 'dentvid_clinics' and column_name = 'review_demo'; -- false | NO
--   -- as an authenticated user the flag cannot be raised:
--   begin; set local role authenticated;
--   select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
--   update public.dentvid_clinics set review_demo = true returning review_demo; -- false (or 0 rows under RLS)
--   rollback;
-- ------------------------------------------------------------
