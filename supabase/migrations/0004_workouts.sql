-- supabase/migrations/0004_workouts.sql

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start_date date not null,
  status text not null check (status in ('proposed', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create index workout_plans_user_id_idx on public.workout_plans(user_id);

alter table public.workout_plans enable row level security;

create policy "users manage own workout plans"
  on public.workout_plans for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------

create table public.workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid references public.workout_plans(id) on delete cascade not null,
  day_of_week text not null check (day_of_week in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  name text not null,
  exercises jsonb not null default '[]'
);

create index workout_plan_items_plan_id_idx on public.workout_plan_items(workout_plan_id);

alter table public.workout_plan_items enable row level security;

create policy "users manage own workout plan items"
  on public.workout_plan_items for all
  using (
    workout_plan_id in (select id from public.workout_plans where user_id = auth.uid())
  )
  with check (
    workout_plan_id in (select id from public.workout_plans where user_id = auth.uid())
  );

-- -------------------------------------------------------

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  workout_plan_item_id uuid references public.workout_plan_items(id) on delete set null,
  completed boolean not null default false,
  exercises_logged jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now()
);

create index workout_logs_user_id_idx on public.workout_logs(user_id);
create index workout_logs_item_id_idx on public.workout_logs(workout_plan_item_id);

create unique index workout_logs_item_date_uidx
  on public.workout_logs(workout_plan_item_id, date)
  where workout_plan_item_id is not null;

alter table public.workout_logs enable row level security;

create policy "users manage own workout logs"
  on public.workout_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
