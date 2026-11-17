-- ============================================================
-- Liman: Bulsu Labs Studio member RPCs — server audit 2026-11-14 (H4).
--
-- 1) NULL-guard bypass: for a caller who is not a member, workspace_role()
--    returns NULL, so `v_caller_role <> 'owner'` and `v_role not in (...)`
--    evaluate to NULL and the "not authorized" branch was skipped.
--    Now a NULL role is refused explicitly. Bodies otherwise unchanged.
-- 2) These SECURITY DEFINER functions all act on auth.uid(); anon has no
--    legitimate use for them. EXECUTE is revoked from anon/public and kept
--    for authenticated and service_role.
-- Idempotent.
-- ============================================================

create or replace function public.revoke_workspace_invite(p_invite_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_workspace uuid;
  v_role public.member_role;
begin
  select workspace_id into v_workspace
  from public.workspace_invites
  where id = p_invite_id;

  if v_workspace is null then
    raise exception 'invite not found';
  end if;

  v_role := public.workspace_role(v_workspace);
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.workspace_invites where id = p_invite_id;
end;
$function$;

create or replace function public.update_member_role(p_workspace uuid, p_user uuid, p_new_role member_role)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller_role public.member_role;
  v_target_role public.member_role;
  v_owner_count int;
begin
  v_caller_role := public.workspace_role(p_workspace);
  if v_caller_role is distinct from 'owner' then
    raise exception 'only owners can change roles' using errcode = '42501';
  end if;

  select role into v_target_role
  from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
  if v_target_role is null then
    raise exception 'target is not a member';
  end if;

  -- Demoting an owner: must keep at least one owner.
  if v_target_role = 'owner' and p_new_role <> 'owner' then
    select count(*) into v_owner_count
    from public.workspace_members
    where workspace_id = p_workspace and role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'cannot demote the last owner';
    end if;
  end if;

  update public.workspace_members
  set role = p_new_role
  where workspace_id = p_workspace and user_id = p_user;
end;
$function$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.update_member_role(uuid,uuid,public.member_role)',
    'public.revoke_workspace_invite(uuid)',
    'public.remove_workspace_member(uuid,uuid)',
    'public.list_workspace_invites(uuid)',
    'public.list_workspace_members(uuid)',
    'public.accept_workspace_invite(uuid,text)',
    'public.admin_create_workspace(text,text,integer)',
    'public.admin_grant_credits(uuid,integer,text)',
    'public.admin_grant_credits_expiring(uuid,integer,text,integer,jsonb)',
    'public.admin_list_workspaces()'
  ] loop
    execute format('revoke execute on function %s from anon, public', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
