-- ============================================================
-- ClipForge — admin-issued promo codes (PR launches, partner deals,
-- "sorry we screwed up" recovery)
--
-- Different from referrals (00012): promo codes are minted by the
-- team, not by users, and grant a fixed credit amount to any user
-- who redeems. Same anti-abuse pattern: atomic SECURITY DEFINER RPC,
-- one-redemption-per-user-per-code, global cap, optional expiry.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.promo_codes (
  code text primary key check (char_length(code) between 3 and 32),
  credits_granted int not null check (credits_granted between 1 and 500),
  max_redemptions int,                       -- null = unlimited
  total_redeemed int not null default 0,
  expires_at timestamptz,                     -- null = no expiry
  notes text,                                 -- admin-readable
  created_at timestamptz not null default now()
);

create table if not exists clipforge.promo_redemptions (
  id uuid primary key default uuid_generate_v4(),
  code text not null references clipforge.promo_codes(code) on delete cascade,
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code, user_id)                      -- one redemption per code per user
);
create index if not exists promo_redemptions_user_idx
  on clipforge.promo_redemptions (user_id, redeemed_at desc);

alter table clipforge.promo_codes enable row level security;
alter table clipforge.promo_redemptions enable row level security;

-- Codes are private — clients never read the table directly; the RPC
-- validates the code by primary-key lookup under service role.
drop policy if exists "promo_codes no read" on clipforge.promo_codes;
create policy "promo_codes no read"
  on clipforge.promo_codes for select using (false);

-- Users can read their own redemptions (so the iOS UI can show "you
-- already redeemed this") but never insert directly — only the RPC.
drop policy if exists "promo_redemptions self read" on clipforge.promo_redemptions;
create policy "promo_redemptions self read"
  on clipforge.promo_redemptions for select using (auth.uid() = user_id);

/**
 * Atomic redemption. Validates: code exists, not expired, under cap,
 * not already redeemed by this user. On success, increments
 * total_redeemed + inserts a redemption row + grants credits.
 */
create or replace function clipforge.redeem_promo(p_code text)
returns table (ok boolean, error text, credits int)
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  v_user uuid := auth.uid();
  v_promo clipforge.promo_codes%rowtype;
begin
  if v_user is null then
    return query select false, 'unauthenticated', 0;
    return;
  end if;

  -- Normalise: trim + uppercase so the user can paste sloppily.
  p_code := upper(trim(p_code));

  select * into v_promo from clipforge.promo_codes where code = p_code;
  if not found then
    return query select false, 'code_not_found', 0;
    return;
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return query select false, 'code_expired', 0;
    return;
  end if;
  if v_promo.max_redemptions is not null
     and v_promo.total_redeemed >= v_promo.max_redemptions then
    return query select false, 'code_exhausted', 0;
    return;
  end if;

  -- Insert; unique (code, user_id) blocks re-redeem.
  begin
    insert into clipforge.promo_redemptions (code, user_id) values (p_code, v_user);
  exception when unique_violation then
    return query select false, 'already_redeemed', 0;
    return;
  end;

  -- Bump cap counter atomically with the insert above (FOR UPDATE not
  -- needed — the unique constraint serialises us per-user).
  update clipforge.promo_codes
     set total_redeemed = total_redeemed + 1
   where code = p_code;

  -- Grant credits via the existing security-definer function so the
  -- ledger row is consistent with referral / subscription grants.
  perform clipforge.grant_credits(
    p_user_id => v_user,
    p_amount => v_promo.credits_granted,
    p_kind => 'promo_grant',
    p_reason => 'redeemed promo code ' || p_code,
    p_reference => p_code,
    p_metadata => jsonb_build_object('code', p_code)
  );

  return query select true, null::text, v_promo.credits_granted;
end;
$$;

revoke all on function clipforge.redeem_promo(text) from public;
grant execute on function clipforge.redeem_promo(text) to authenticated;
