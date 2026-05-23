-- ============================================================
-- ClipForge — Plus-tier custom branding (logo watermark on renders)
--
-- One row per user. Worker reads this during the render step and (when
-- the user is on Plus) composites their logo onto every clip in place
-- of the default "Made with ClipForge" outro.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.clip_branding (
  user_id uuid primary key references clipforge.profiles(id) on delete cascade,
  logo_path text not null,        -- storage path in clipforge-faces bucket
  position text not null default 'bottom-right'
    check (position in ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  opacity numeric(3,2) not null default 0.85
    check (opacity between 0.10 and 1.00),
  updated_at timestamptz not null default now()
);

alter table clipforge.clip_branding enable row level security;

-- Users can read + write their own row. The worker reads via service
-- role which bypasses RLS, so this is purely client-facing.
drop policy if exists "branding self read" on clipforge.clip_branding;
create policy "branding self read"
  on clipforge.clip_branding
  for select using (auth.uid() = user_id);

drop policy if exists "branding self all" on clipforge.clip_branding;
create policy "branding self all"
  on clipforge.clip_branding
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
