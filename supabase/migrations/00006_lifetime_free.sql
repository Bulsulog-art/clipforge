-- ============================================================
-- ClipForge — Switch to lifetime 1-credit free model
-- Free tier no longer auto-refills monthly. New signups get 1
-- starter credit. Existing free users who already consumed their
-- starter still get one chance.
-- ============================================================
set search_path = clipforge, public;

-- Stop the monthly refill cron — was 5 credits/month, now zero refill
do $$
begin
  perform cron.unschedule('clipforge-free-monthly-refill');
exception when others then
  -- ignore if it never existed
  null;
end$$;

-- New-user trigger now grants 1 credit (was 5)
create or replace function clipforge.handle_new_user()
returns trigger language plpgsql security definer set search_path = clipforge, public as $$
begin
  insert into clipforge.profiles (id, email, credits_balance, free_credits_refilled_at)
  values (new.id, new.email, 1, current_date)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- refill_free_credits is left in the schema but should not be scheduled.
-- If ever called manually, neutralise the default amount.
create or replace function clipforge.refill_free_credits(p_amount integer default 0)
returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
begin
  -- The lifetime free model means no monthly refill. Use grant_credits()
  -- directly if a one-off support gift is needed.
  return 0;
end;
$$;

-- Update v_user_credits monthly_grant reflection
create or replace view clipforge.v_user_credits as
select
  p.id as user_id,
  p.tier,
  p.credits_balance,
  p.credits_lifetime_purchased,
  p.credits_lifetime_consumed,
  case p.tier
    when 'free' then 0          -- no monthly grant on free; 1 lifetime at signup
    when 'starter' then 40      -- Plus monthly default
    else 0
  end as monthly_grant
from clipforge.profiles p;
