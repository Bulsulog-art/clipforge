-- ============================================================
-- ClipForge — make grant_credits idempotent by (reference, kind)
--
-- The RevenueCat webhook calls grant_credits with p_reference = the RC
-- transaction_id. RevenueCat retries deliveries on any non-2xx response and
-- can replay events, so the same transaction could be granted multiple times,
-- silently multiplying a user's credits (and lifetime_purchased). The previous
-- function always inserted + bumped with no dedup.
--
-- Fix: if a credit_event with the same external reference AND kind already
-- exists, skip the grant and return the current balance. Null references
-- (e.g. free_monthly refills) are unaffected — they intentionally don't dedup.
-- RevenueCat retries are sequential, so the exists-check fully covers them.
-- ============================================================

set search_path = clipforge, public;

create or replace function clipforge.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_kind clipforge.credit_event_kind,
  p_reason text default null,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits requires positive amount';
  end if;

  -- Idempotency guard: a retried/replayed webhook for the same external
  -- transaction must not grant twice. Scoped to (reference, kind) so a
  -- purchase and a later refund referencing the same transaction don't clash.
  if p_reference is not null then
    if exists (
      select 1 from clipforge.credit_events
      where reference = p_reference and kind = p_kind
    ) then
      return (select credits_balance from clipforge.profiles where id = p_user_id);
    end if;
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance + p_amount,
      credits_lifetime_purchased = case
        when p_kind in ('purchase','subscription_grant') then credits_lifetime_purchased + p_amount
        else credits_lifetime_purchased
      end
  where id = p_user_id
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, metadata, balance_after)
  values (p_user_id, p_kind, p_amount, p_reason, p_reference, p_metadata, new_balance);

  return new_balance;
end;
$$;
