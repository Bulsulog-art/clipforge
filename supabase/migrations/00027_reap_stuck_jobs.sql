-- ============================================================
-- ClipForge — stuck-job reaper
--
-- If the worker is SIGKILLed mid-render (OOM on a large ffmpeg job) or an
-- enqueue is lost, a row can sit in a non-terminal status forever. The app
-- polls it indefinitely → an eternal "processing" spinner, and the reserved
-- credit is never returned. BullMQ's own retry never reconciles the DB row.
--
-- This function flips any non-terminal video/avatar/derivative row older than
-- p_older_than to 'failed' and refunds whatever credits were consumed for it
-- (idempotently, via grant_credits' (reference,kind) dedup). 60-minute default
-- so a legitimately long render or a briefly-backlogged queue is never killed.
-- Called every ~10 min from the worker cron (see worker/src/index.ts).
-- ============================================================

set search_path = clipforge, public;

create or replace function clipforge.reap_stuck_jobs(p_older_than interval default '60 minutes')
returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  r record;
  reaped integer := 0;
  consumed integer;
begin
  -- video_jobs
  for r in
    select id, user_id from clipforge.video_jobs
    where status in ('queued','transcribing','scoring','rendering')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.video_jobs
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  -- avatar_jobs
  for r in
    select id, user_id from clipforge.avatar_jobs
    where status in ('queued','synthesizing_voice','lipsyncing','rendering')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.avatar_jobs
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  -- clip_derivatives
  for r in
    select id, user_id from clipforge.clip_derivatives
    where status in ('queued','processing')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.clip_derivatives
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  return reaped;
end;
$$;