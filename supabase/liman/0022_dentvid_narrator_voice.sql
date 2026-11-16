-- ============================================================
-- DentVideo: the clinic's narrator voice in the profile guard (Liman).
-- NOT applied automatically. Apply by hand after 0021 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
--
-- The clinic settings form now offers "Narrator voice: Female / Male"
-- (profile.narratorVoice), which the worker maps to the TTS voice
-- (worker/src/dental/voice.ts, dental/elevenlabs.ts). The guard allows only
-- known profile keys, so before this migration an owner write with
-- "narratorVoice" is refused (23514). The app works either way: on 23514 the
-- clinic route saves the profile without it as the owner and adds it with the
-- service role, after checking it is "female" or "male"
-- (web/src/app/api/dentvideo/clinic/route.ts).
--
-- Only dentvid_profile_ok changes: the function from 0021, unchanged, with
-- one more allowed key and its enum check. The trigger is unchanged.
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
    if k not in ('name', 'city', 'country', 'language', 'services', 'tone', 'address', 'handle', 'bookingUrl', 'brandColor', 'closingLine', 'narratorVoice') then
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
  -- Who narrates the videos (clinic settings). Unset means female.
  if p ? 'narratorVoice' and (coalesce(jsonb_typeof(p -> 'narratorVoice'), '') <> 'string' or (p ->> 'narratorVoice') not in ('female', 'male')) then
    return false;
  end if;
  return true;
end;
$$;

-- Checks (run after applying) -------------------------------------------------
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"narratorVoice":"male"}'::jsonb);    -- t
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"narratorVoice":"female"}'::jsonb);  -- t
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"narratorVoice":"robot"}'::jsonb);   -- f (not a choice)
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"narratorVoice":1}'::jsonb);         -- f (not a string)
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"closingLine":"Fragen zum Zahnfleisch? Sprechen Sie sie bei der nächsten Kontrolle an."}'::jsonb);  -- t (0021 still)
-- select public.dentvid_profile_ok('{"name":"A","country":"DE","language":"de","services":["PZR"],"logo":"/etc/passwd"}'::jsonb);      -- f (still)
