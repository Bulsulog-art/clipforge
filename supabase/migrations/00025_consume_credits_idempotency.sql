-- ============================================================
-- ClipForge — make consume_credits idempotent by (reference)
--
-- video/derivative/avatar jobs are enqueued with BullMQ attempts 2-3. Each
-- retry RE-RUNS the worker, which calls consume_credits again with the same
-- jobId/derivativeId as p_reference. grant_credits was already made idempotent
-- (00023), so on a transient failure the per-attempt REFUND is skipped on the
-- 2nd attempt while the consume DEDUCTS AGAIN — silently draining a paying
-- user's balance by one extra charge per retry (the common case on any FAL /
-- OpenAI / yt-dlp blip).
--
-- Fix: if a 'consume' credit_event with the same reference already exists,
-- return the current balance WITHOUT deducting again. Scoped to kind='consume'
-- so it never clashes with a refund (admin_grant) that reuses the same
-- reference. Null references (if any) are unaffected and never dedup.
-- ============================================================

set search_path = clipforge, public;

create or replace function clipforge.consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default null,
  p_reference text default null
) returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'consume_credits requires positive amount';
  end if;

  -- Idempotency guard: a BullMQ retry re-running the same job/derivative must
  -- not charge twice. A 'consume' event already recorded for this reference
  -- means the charge happened on an earlier attempt — return the current
  -- balance unchanged.
  if p_reference is not null then
    if exists (
      select 1 from clipforge.credit_events
      where reference = p_reference and kind = 'consume'
    ) then
      return (select credits_balance from clipforge.profiles where id = p_user_id);
    end if;
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance - p_amount,
      credits_lifetime_consumed = credits_lifetime_consumed + p_amount
  where id = p_user_id
    and credits_balance >= p_amount
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, balance_after)
  values (p_user_id, 'consume', -p_amount, p_reason, p_reference, new_balance);

  return new_balance;
end;
$$;
