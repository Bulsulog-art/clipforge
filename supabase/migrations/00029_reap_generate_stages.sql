-- ============================================================
-- ClipForge — teach the stuck-job reaper about the generate stages
--
-- 00027 lists the non-terminal statuses by name. The prompt→video pipeline
-- added three the reaper has never heard of, so a generate job killed mid-plan
-- or mid-upload would sit in 'planning' forever: an eternal spinner for the
-- person, and a credit that is never given back.
--
-- Separate migration from 00028 on purpose — a new enum value is not usable
-- until the transaction that added it commits.
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
  -- video_jobs — both pipelines. 'planning', 'gathering' and 'uploading'
  -- belong to prompt→video; the rest to clipping.
  for r in
    select id, user_id from clipforge.video_jobs
    where status in ('queued','transcribing','scoring','rendering','planning','gathering','uploading')
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
