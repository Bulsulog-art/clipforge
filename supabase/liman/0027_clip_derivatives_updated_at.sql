-- Same fix as supabase/migrations/00032 (the 0017 schema copy had the same flaw).
-- Applied by hand on 2026-11-17.
alter table clipforge.clip_derivatives add column if not exists updated_at timestamptz not null default now();
