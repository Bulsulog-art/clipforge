-- clipforge.handle_new_user() runs on EVERY auth.users insert in this project,
-- and this project is shared by ClipForge, AuraGlow and Telve.
--
-- clipforge.profiles.email is NOT NULL and UNIQUE. An anonymous signup
-- (AuraGlow's guest flow) has new.email = NULL, so the insert raised 23502 and
-- rolled the whole auth.users insert back. GoTrue surfaced that as
-- "Database error creating anonymous user" (HTTP 500).
--
-- Fallout: every AuraGlow guest from 2026-05-14 onward was left without a
-- Supabase session. AuraGlow's paid endpoints (analyze-skin,
-- analyze-ingredients, skin-coach-chat) all require a JWT, so a guest who
-- subscribed was shown as Pro by RevenueCat and then refused by the server.
-- At least one customer paid CAD 9.99 and could not use anything.
--
-- Two changes, both narrow:
--   1. Skip email-less signups. They are not ClipForge users; there is no
--      profile to create.
--   2. Never let a ClipForge bookkeeping failure abort account creation for
--      another app. This also covers the latent UNIQUE(email) collision that
--      "on conflict (id)" did not handle — two auth users can share an email
--      across providers (Apple private relay vs. plain email).
--
-- Lesson worth keeping: a trigger on auth.users is global to the project. In a
-- multi-tenant Supabase project it must be defensive about every other app's
-- signup shape, and it must never be able to abort the insert.
create or replace function clipforge.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'clipforge', 'public'
as $function$
begin
  if new.email is null or new.email = '' then
    return new;
  end if;

  begin
    insert into clipforge.profiles (id, email, credits_balance, free_credits_refilled_at)
    values (new.id, new.email, 1, current_date)
    on conflict (id) do nothing;
  exception when others then
    raise warning '[clipforge.handle_new_user] profile insert skipped for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;
