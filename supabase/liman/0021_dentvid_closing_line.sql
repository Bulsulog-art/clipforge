-- ============================================================
-- DentVideo: the clinic's own closing line in the profile guard (Liman).
-- NOT applied automatically. Apply by hand after 0007 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
--
-- The clinic settings form now offers an optional "closing line for
-- captions" (profile.closingLine, max 120 characters), which the worker's
-- post kit uses when it passes the market rules (dentvid/post-kit.ts
-- softCta). The 0007 guard allows only known profile keys, so before this
-- migration an owner write with "closingLine" is refused (23514). The app
-- works either way: on 23514 the clinic route saves the profile without the
-- line as the owner and adds the line with the service role, after checking
-- its shape and market rules (web/src/app/api/dentvideo/clinic/route.ts).
--
-- Only dentvid_profile_ok changes: the same function as 0007 with one more
-- allowed key and its plain-text check. The trigger is unchanged.
-- ============================================================

create or replace function public.dentvid_profile_ok(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  s jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  for k in select jsonb_object_keys(p) loop
    if k not in ('name', 'city', 'country', 'language', 'services', 'tone', 'address', 'handle', 'bookingUrl', 'brandColor', 'closingLine') then
      return false;
    end if;
  end loop;

  if coalesce(jsonb_typeof(p -> 'name'), '') <> 'string' or not public.dentvid_plain_text(p ->> 'name', 1, 80) then
    return false;
  end if;
  if p ? 'city' and (coalesce(jsonb_typeof(p -> 'city'), '') <> 'string' or not public.dentvid_plain_text(p ->> 'city', 0, 60)) then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'country'), '') <> 'string' or (p ->> 'country') !~ '^[A-Za-z]{2}$' then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'language'), '') <> 'string'
     or (p ->> 'language') not in ('en', 'de', 'es', 'fr', 'it', 'pt', 'tr', 'ja', 'ar', 'pl') then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'services'), '') <> 'array' or jsonb_array_length(p -> 'services') not between 1 and 20 then
    return false;
  end if;
  for s in select jsonb_array_elements(p -> 'services') loop
    if jsonb_typeof(s) <> 'string' or not public.dentvid_plain_text(s #>> '{}', 2, 60) then
      return false;
    end if;
  end loop;
  if p ? 'tone' and (coalesce(jsonb_typeof(p -> 'tone'), '') <> 'string' or (p ->> 'tone') not in ('warm', 'expert', 'playful', 'calm')) then
    return false;
  end if;
  if p ? 'address' and (coalesce(jsonb_typeof(p -> 'address'), '') <> 'string' or (p ->> 'address') not in ('formal', 'informal')) then
    return false;
  end if;
  if p ? 'handle' and (coalesce(jsonb_typeof(p -> 'handle'), '') <> 'string' or (p ->> 'handle') !~ '^[A-Za-z0-9._-]{1,40}$') then
    return false;
  end if;
  if p ? 'bookingUrl' and (coalesce(jsonb_typeof(p -> 'bookingUrl'), '') <> 'string'
     or char_length(p ->> 'bookingUrl') > 298
     or (p ->> 'bookingUrl') !~* '^https://[^[:space:]"''<>\\]{3,}$') then
    return false;
  end if;
  if p ? 'brandColor' and (coalesce(jsonb_typeof(p -> 'brandColor'), '') <> 'string' or (p ->> 'brandColor') !~ '^#?[0-9A-Fa-f]{6}$') then
    return false;
  end if;
  -- The clinic's own closing line under its captions (plain text, 4–120).
  -- Whether it may go out in the clinic's market is checked by the app
  -- (web/src/lib/dentvid/closing-line.ts) and again by the worker.
  if p ? 'closingLine' and (coalesce(jsonb_typeof(p -> 'closingLine'), '') <> 'string' or not public.dentvid_plain_text(p ->> 'closingLine', 4, 120)) then
    return false;
  end if;
  return true;
end;
$$;

-- Checks (run after applying) -------------------------------------------------
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"closingLine":"Fragen zum Zahnfleisch? Sprechen Sie sie bei der nächsten Kontrolle an."}'::jsonb);  -- t
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"closingLine":"https://example.com/book"}'::jsonb);  -- f (URL)
-- select public.dentvid_profile_ok(jsonb_build_object('name','A','country','DE','language','de','services',jsonb_build_array('PZR'),'closingLine',repeat('a',121)));  -- f (too long)
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"logo":"/etc/passwd"}'::jsonb);  -- f (still)
