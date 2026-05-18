-- ============================================================
-- ClipForge — Push notification tokens
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',         -- 'ios' | 'android' (future)
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_idx on clipforge.push_tokens (user_id);

alter table clipforge.push_tokens enable row level security;

create policy "push self all"
  on clipforge.push_tokens
  for all using (auth.uid() = user_id);
