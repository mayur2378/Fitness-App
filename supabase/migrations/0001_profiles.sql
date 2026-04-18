-- supabase/migrations/0001_profiles.sql

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  age integer not null check (age between 13 and 120),
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 500),
  height_cm numeric(5,2) not null check (height_cm between 50 and 300),
  goal text not null check (goal in ('lose', 'gain', 'maintain')),
  target_weight_kg numeric(5,2) check (target_weight_kg between 20 and 500),
  activity_level text not null check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  workout_days_per_week integer not null check (workout_days_per_week between 1 and 7),
  cuisine_preference text not null,
  dietary_restrictions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on row modification
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);
