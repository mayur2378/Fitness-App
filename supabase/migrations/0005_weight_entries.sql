create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index on weight_entries (user_id);

alter table weight_entries enable row level security;

create policy "Users manage own weight entries"
  on weight_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
