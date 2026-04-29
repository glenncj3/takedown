-- Rooms table for the multiplayer lobby. Per DESIGN §12, this is the only
-- piece of persistent state — actual game state lives in-memory on each
-- client and is exchanged over Realtime Broadcast.
--
-- The trust model is "clients trust each other"; there is no security
-- boundary. RLS allows anonymous insert/select/update.

create table if not exists public.rooms (
  code text primary key,
  host_name text not null,
  joiner_name text,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Anonymous access only — this is hobby-grade.
create policy "rooms_anon_insert" on public.rooms
  for insert to anon with check (true);

create policy "rooms_anon_select" on public.rooms
  for select to anon using (true);

create policy "rooms_anon_update" on public.rooms
  for update to anon using (true) with check (true);

-- Index to scan for stale rooms during garbage collection. Optional —
-- the README explains how to clean up rooms older than 1 hour.
create index if not exists rooms_created_at_idx on public.rooms (created_at);
