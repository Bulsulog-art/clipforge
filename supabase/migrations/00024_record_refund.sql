-- ============================================================
-- ClipForge — refund clawback for consumable credit packs
--
-- The RevenueCat REFUND webhook branch was dead code: it called grant_credits
-- with amount 0 (a no-op that also raised because grant_credits requires a
-- positive amount, swallowed by .then(()=>{},()=>{})). So a refunded credit
-- pack never clawed anything back or even logged the refund.
--
-- record_refund deducts up to the user's CURRENT balance (never negative —
-- credits already spent can't be reclaimed) and logs a 'refund' credit_event
-- with the actual clawed-back amount. Idempotent by (reference, kind='refund')
-- so a retried REFUND webhook doesn't double-deduct.
-- ============================================================

set search_path = clipforge, public;

create or replace function clipforge.record_refund(
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
  cur integer;
  deduct integer;
  new_balance integer;
begin
  if p_amount < 0 then
    raise exception 'record_refund requires non-negative amount';
  end if;

  if p_reference is not null and exists (
    select 1 from clipforge.credit_events
    where reference = p_reference and kind = 'refund'
  ) then
    return (select credits_balance from clipforge.profiles where id = p_user_id);
  end if;

  select credits_balance into cur from clipforge.profiles where id = p_user_id for update;
  if cur is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  deduct := least(cur, p_amount); -- clamp at available balance — never go negative

  update clipforge.profiles
    set credits_balance = credits_balance - deduct
    where id = p_user_id
    returning credits_balance into new_balance;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, metadata, balance_after)
  values (
    p_user_id, 'refund', -deduct, p_reason, p_reference,
    jsonb_build_object('refund_requested', p_amount, 'clawed_back', deduct),
    new_balance
  );

  return new_balance;
end;
$$;
