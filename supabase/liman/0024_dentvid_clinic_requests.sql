-- ============================================================
-- DentVideo: topic suggestions, change requests, subtitles and library
-- retention after a plan ends (Liman). Additive only.
-- NOT applied automatically. Apply by hand after 0023 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
--
-- 1. dentvid_topic_requests: a clinic suggests a topic ("Suggest a topic for
--    next week", max 140 characters, plain text). The Monday week uses
--    pending suggestions first when they pass the strategist's service and
--    ad-rule filters and the reviewers (worker/src/dentvid/topic-requests.ts);
--    a refused one carries a reason code the app shows as one sentence.
-- 2. dentvid_change_requests: "Ask for a change" on one generated video. The
--    worker re-makes only that video with the note as guidance, through the
--    same checks, within the spend guard's caps (worker/src/dentvid/change.ts).
-- 3. dentvid_items.subtitles: the narration's timed cues (WebVTT / SRT are
--    built from them on download), computed from the narration's measured
--    pauses at render time (worker/src/dental/subtitles.ts).
-- 4. dentvid_clinics.plan_ended_at / library_delete_after / library_deleted_at:
--    the 90-day library retention after a plan ends (worker/src/dentvid/retention.ts).
--
-- Both request tables are written ONLY by the API / worker with the service
-- role (owner_id and clinic_id from the session); owners may read their own
-- rows (RLS). There is no insert/update/delete policy, so a direct REST write
-- with a user token is refused.
--
-- Until this is applied the app keeps working: the suggestion and change
-- forms answer "not available yet", the worker stores videos without
-- subtitles (and the download link is not shown), and the retention job
-- logs "migration missing" and does nothing.
-- ============================================================

-- 1. Topic suggestions -----------------------------------------------------------

create table if not exists public.dentvid_topic_requests (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.dentvid_clinics(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  -- Plain text, 3–140 characters, no control characters (the API checks more: URLs, ad rules).
  text        text not null check (char_length(text) between 3 and 140 and text !~ '[[:cntrl:]]'),
  status      text not null default 'pending' check (status in ('pending', 'used', 'refused')),
  -- Why a suggestion was not used, as a code the app turns into a sentence in the clinic's language.
  reason      text check (reason is null or reason in ('not_offered', 'ad_rules', 'clinical', 'unclear', 'checks')),
  -- The video made from it (status used) and its week.
  item_id     uuid references public.dentvid_items(id) on delete set null,
  week_of     date,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create index if not exists dentvid_topic_requests_clinic_idx on public.dentvid_topic_requests (clinic_id, created_at desc);
create index if not exists dentvid_topic_requests_pending_idx on public.dentvid_topic_requests (clinic_id, created_at) where status = 'pending';

alter table public.dentvid_topic_requests enable row level security;
revoke all on public.dentvid_topic_requests from anon;
revoke insert, update, delete, truncate, references, trigger on public.dentvid_topic_requests from authenticated;

drop policy if exists "dentvid topic request self read" on public.dentvid_topic_requests;
create policy "dentvid topic request self read" on public.dentvid_topic_requests for select using (auth.uid() = owner_id);

comment on table public.dentvid_topic_requests is
  'DentVideo: topics a clinic suggested for its weekly videos. Written only by the API and the worker with the service role.';

-- 2. Change requests ------------------------------------------------------------

create table if not exists public.dentvid_change_requests (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.dentvid_clinics(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  item_id      uuid not null references public.dentvid_items(id) on delete cascade,
  -- What to change, in the clinic's words: plain text, 3–300 characters.
  note         text not null check (char_length(note) between 3 and 300 and note !~ '[[:cntrl:]]'),
  status       text not null default 'queued' check (status in ('queued', 'working', 'done', 'refused', 'failed')),
  -- refused: 'checks' (the changed version did not pass the reviews; the old video stays), 'no_plan';
  -- failed: 'busy' (spend cap reached), 'technical'.
  reason       text check (reason is null or reason in ('checks', 'no_plan', 'busy', 'technical', 'not_possible')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists dentvid_change_requests_clinic_idx on public.dentvid_change_requests (clinic_id, created_at desc);
create index if not exists dentvid_change_requests_item_idx on public.dentvid_change_requests (item_id, created_at desc);

alter table public.dentvid_change_requests enable row level security;
revoke all on public.dentvid_change_requests from anon;
revoke insert, update, delete, truncate, references, trigger on public.dentvid_change_requests from authenticated;

drop policy if exists "dentvid change request self read" on public.dentvid_change_requests;
create policy "dentvid change request self read" on public.dentvid_change_requests for select using (auth.uid() = owner_id);

comment on table public.dentvid_change_requests is
  'DentVideo: "Ask for a change" on one video. Written only by the API and the worker with the service role.';

-- 3. Subtitles ------------------------------------------------------------------

alter table public.dentvid_items add column if not exists subtitles jsonb;
comment on column public.dentvid_items.subtitles is
  'Timed narration cues {v, source, cues: [{start, end, text}]}; the SRT / WebVTT download is built from them. Worker-written.';

-- Owners still change only their decision, photo choice and posted tick: the
-- 0004 guard, unchanged, plus the new subtitles column.
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
    new.subtitles   := old.subtitles;
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

-- 4. Library retention after a plan ends -----------------------------------------

alter table public.dentvid_clinics add column if not exists plan_ended_at timestamptz;
alter table public.dentvid_clinics add column if not exists library_delete_after timestamptz;
alter table public.dentvid_clinics add column if not exists library_deleted_at timestamptz;

comment on column public.dentvid_clinics.plan_ended_at is
  'When the plan ended (plan = cancelled); set by the worker. Videos and files are kept 90 days from here.';
comment on column public.dentvid_clinics.library_delete_after is
  'Set when the 14-day reminder went out: the library is not deleted before this (never earlier than plan_ended_at + 90 days).';
comment on column public.dentvid_clinics.library_deleted_at is
  'When the retention job deleted the videos and files of the plan that ended at plan_ended_at.';

-- An owner cannot move these dates through the REST API (they decide when the library goes).
create or replace function public.dentvid_clinics_guard_retention()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.plan_ended_at := null;
      new.library_delete_after := null;
      new.library_deleted_at := null;
    else
      new.plan_ended_at := old.plan_ended_at;
      new.library_delete_after := old.library_delete_after;
      new.library_deleted_at := old.library_deleted_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_retention on public.dentvid_clinics;
create trigger dentvid_clinics_guard_retention
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_retention();

-- The daily retention query: ended plans whose library is still there.
create index if not exists dentvid_clinics_plan_ended_idx
  on public.dentvid_clinics (plan_ended_at)
  where plan = 'cancelled';

-- Checks (run after applying) ---------------------------------------------------
-- select relname, relrowsecurity from pg_class where relname in ('dentvid_topic_requests', 'dentvid_change_requests');  -- both t
-- select tablename, policyname, cmd from pg_policies where tablename in ('dentvid_topic_requests', 'dentvid_change_requests');
--   → one row each, cmd SELECT
-- select table_name, string_agg(privilege_type, ',') from information_schema.role_table_grants
--  where table_name in ('dentvid_topic_requests', 'dentvid_change_requests') and grantee in ('anon', 'authenticated')
--  group by table_name;  -- authenticated SELECT only; no anon rows
-- select column_name from information_schema.columns where table_name = 'dentvid_items' and column_name = 'subtitles';  -- subtitles
-- select column_name from information_schema.columns where table_name = 'dentvid_clinics'
--  and column_name in ('plan_ended_at', 'library_delete_after', 'library_deleted_at');  -- 3 rows
-- select tgname from pg_trigger where tgrelid = 'public.dentvid_clinics'::regclass and tgname = 'dentvid_clinics_guard_retention';
-- Existing rows are untouched: all three columns are null right after applying.
-- select count(*) from public.dentvid_clinics where plan_ended_at is not null or library_deleted_at is not null;  -- 0
-- Then, as a real clinic: save the clinic form, approve a video, pick background photos — all still work.
