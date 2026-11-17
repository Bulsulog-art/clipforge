-- ============================================================
-- Liman (shared Supabase): admin_create_workspace must not hand a Bulsu Labs
-- Studio workspace to an account that never proved it owns the address.
--
-- Found in the DentVideo security audit (2026-11-13, H2): DentVideo's sign-up
-- creates the Liman login with email_confirm=true before the address is
-- proven (the 6-digit code comes after). admin_create_workspace then made ANY
-- existing user with that email the workspace owner at once — so someone who
-- signed up on DentVideo with a prospect's address would receive the
-- workspace an admin later provisions for that prospect.
--
-- Now an existing user becomes owner immediately only when the address is
-- proven for the purposes of this check:
--   - the account is not a DentVideo account at all (Studio's own users,
--     unchanged behaviour), or
--   - it is a DentVideo account whose address DentVideo has verified
--     (app_metadata.email_verified_at present and email_verified_for equal to
--     the current address).
-- Otherwise the function behaves exactly as for an unknown email: the admin
-- is the nominal owner and needs_invite = true, so the emailed invite (which
-- proves the mailbox) transfers ownership.
--
-- Same signature, same return shape, same security definer and search_path.
-- Idempotent.
-- ============================================================

create or replace function public.admin_create_workspace(p_name text, p_owner_email text, p_initial_credits integer default 50)
 returns table(workspace_id uuid, owner_user_id uuid, needs_invite boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
  v_slug text;
  v_clean text;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_clean := nullif(btrim(p_name), '');
  if v_clean is null then
    raise exception 'workspace name required';
  end if;

  -- Find the user by email (case-insensitive) — only one whose address is proven
  -- (see header): a DentVideo sign-up that never verified its address goes the
  -- invite route like an unknown email.
  select u.id into v_owner_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_owner_email))
    and (
      not (
        coalesce(u.raw_app_meta_data ->> 'product', '') = 'dentvideo'
        or coalesce(u.raw_app_meta_data -> 'products', '[]'::jsonb) ? 'dentvideo'
      )
      or (
        u.raw_app_meta_data ->> 'email_verified_at' is not null
        and lower(coalesce(u.raw_app_meta_data ->> 'email_verified_for', '')) = lower(u.email)
      )
    )
  limit 1;

  v_slug := public.unique_slug(v_clean);

  -- workspaces.owner_id is NOT NULL. If the customer doesn't have a Studio
  -- account yet we put the admin's uid as the nominal owner; the invite
  -- acceptance flow below transfers ownership the moment the customer
  -- claims the workspace.
  insert into public.workspaces(name, slug, owner_id, plan)
  values (v_clean, v_slug, coalesce(v_owner_id, auth.uid()), 'trial')
  returning id into v_workspace_id;

  -- Initial credit grant fires regardless of whether the customer has
  -- accepted yet — that way the workspace is ready to use the moment
  -- they log in.
  if p_initial_credits is not null and p_initial_credits > 0 then
    insert into public.credit_ledger(workspace_id, delta, reason, metadata)
    values (
      v_workspace_id,
      p_initial_credits,
      'admin_provision',
      jsonb_build_object('provisioned_by', auth.uid())
    );
  end if;

  if v_owner_id is not null then
    -- Real user → owner membership now
    insert into public.workspace_members(workspace_id, user_id, role)
    values (v_workspace_id, v_owner_id, 'owner');
  end if;

  return query select v_workspace_id, v_owner_id, (v_owner_id is null);
end;
$function$;
