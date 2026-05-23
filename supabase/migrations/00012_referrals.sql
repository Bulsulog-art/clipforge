-- ============================================================
-- ClipForge — referral codes + redemptions
--
-- Each user is auto-issued a single 8-character `code` when they first
-- visit the referrals screen. New signups can redeem one code, which
-- grants 5 credits to the inviter and 5 to the invitee.
--
-- Anti-abuse:
--   • A user can redeem at most ONE code in their lifetime (unique on
--     redemption table)
--   • A user can't redeem their own code (RPC checks)
--   • An inviter is capped at 20 redemptions total (RPC checks)
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.referral_codes (
  user_id uuid primary key references clipforge.profiles(id) on delete cascade,
  code text unique not null check (char_length(code) = 8),
  created_at timestamptz not null default now()
);
create index if not exists referral_codes_code_idx
  on clipforge.referral_codes (code);

alter table clipforge.referral_codes enable row level security;

-- Users may read + insert their own code row. They can never overwrite
-- their code or read other users' codes.
drop policy if exists "ref_codes self read" on clipforge.referral_codes;
create policy "ref_codes self read"
  on clipforge.referral_codes
  for select using (auth.uid() = user_id);

drop policy if exists "ref_codes self insert" on clipforge.referral_codes;
create policy "ref_codes self insert"
  on clipforge.referral_codes
  for insert with check (auth.uid() = user_id);

-- One row per successful redemption.
create table if not exists clipforge.referrals (
  id uuid primary key default uuid_generate_v4(),
  inviter_user_id uuid not null references clipforge.profiles(id) on delete cascade,
  invitee_user_id uuid not null references clipforge.profiles(id) on delete cascade,
  code text not null,
  inviter_credits_granted int not null default 5,
  invitee_credits_granted int not null default 5,
  created_at timestamptz not null default now(),
  unique (invitee_user_id)
);
create index if not exists referrals_inviter_idx
  on clipforge.referrals (inviter_user_id, created_at desc);

alter table clipforge.referrals enable row level security;

-- Both the inviter and the invitee may read rows where they're a party.
-- No client-side writes — only the RPC below can insert.
drop policy if exists "referrals party read" on clipforge.referrals;
create policy "referrals party read"
  on clipforge.referrals
  for select using (
    auth.uid() = inviter_user_id or auth.uid() = invitee_user_id
  );

-- Atomic redemption RPC. Looks up the code, validates anti-abuse rules,
-- inserts the row, and grants credits to both parties via the existing
-- grant_credits SECURITY DEFINER function.
create or replace function clipforge.redeem_referral(p_code text)
returns table (ok boolean, error text, inviter uuid)
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  v_invitee uuid := auth.uid();
  v_inviter uuid;
  v_count   int;
begin
  if v_invitee is null then
    return query select false, 'unauthenticated', null::uuid;
    return;
  end if;

  -- Look up the code
  select user_id into v_inviter
    from clipforge.referral_codes
   where code = p_code
   limit 1;
  if v_inviter is null then
    return query select false, 'code_not_found', null::uuid;
    return;
  end if;
  if v_inviter = v_invitee then
    return query select false, 'self_referral', null::uuid;
    return;
  end if;

  -- Cap the inviter at 20 redemptions
  select count(*) into v_count
    from clipforge.referrals
   where inviter_user_id = v_inviter;
  if v_count >= 20 then
    return query select false, 'inviter_cap_reached', null::uuid;
    return;
  end if;

  -- Insert; the unique(invitee_user_id) constraint blocks re-redemption.
  begin
    insert into clipforge.referrals (
      inviter_user_id, invitee_user_id, code,
      inviter_credits_granted, invitee_credits_granted
    ) values (v_inviter, v_invitee, p_code, 5, 5);
  exception when unique_violation then
    return query select false, 'already_redeemed', null::uuid;
    return;
  end;

  -- Grant credits to both parties using the existing security-definer fn
  perform clipforge.grant_credits(
    p_user_id => v_inviter,
    p_amount  => 5,
    p_kind    => 'referral_bonus',
    p_reason  => 'invited a friend',
    p_reference => p_code,
    p_metadata => jsonb_build_object('invitee', v_invitee::text)
  );
  perform clipforge.grant_credits(
    p_user_id => v_invitee,
    p_amount  => 5,
    p_kind    => 'referral_bonus',
    p_reason  => 'redeemed referral code',
    p_reference => p_code,
    p_metadata => jsonb_build_object('inviter', v_inviter::text)
  );

  return query select true, null::text, v_inviter;
end;
$$;

revoke all on function clipforge.redeem_referral(text) from public;
grant execute on function clipforge.redeem_referral(text) to authenticated;
