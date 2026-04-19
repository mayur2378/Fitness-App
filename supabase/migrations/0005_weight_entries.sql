create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 500),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index weight_entries_user_id_idx on public.weight_entries (user_id);

alter table public.weight_entries enable row level security;

create policy "users manage own weight entries"
  on public.weight_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
