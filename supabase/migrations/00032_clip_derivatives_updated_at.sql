-- clip_derivatives has a BEFORE UPDATE trigger (set_updated_at) but no updated_at column, so
-- every update failed and the worker's stuck-job reaper aborted every 10 minutes.
-- Applied to the cloud project and to Liman by hand on 2026-11-17.
alter table clipforge.clip_derivatives add column if not exists updated_at timestamptz not null default now();
