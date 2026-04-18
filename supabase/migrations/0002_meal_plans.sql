-- supabase/migrations/0002_meal_plans.sql

-- meal_plans
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start_date date not null,
  status text not null check (status in ('proposed', 'active', 'archived')) default 'active',
  created_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

create policy "Users can view own meal plans"
  on public.meal_plans for select using (auth.uid() = user_id);
create policy "Users can insert own meal plans"
  on public.meal_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own meal plans"
  on public.meal_plans for update using (auth.uid() = user_id);
create policy "Users can delete own meal plans"
  on public.meal_plans for delete using (auth.uid() = user_id);

-- meal_plan_items
create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  day_of_week text not null check (day_of_week in ('mon','tue','wed','thu','fri','sat','sun')),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name text not null,
  calories integer not null,
  protein_g numeric(6,1) not null,
  carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null
);

alter table public.meal_plan_items enable row level security;

create policy "Users can view own meal plan items"
  on public.meal_plan_items for select
  using (exists (select 1 from public.meal_plans where id = meal_plan_id and user_id = auth.uid()));
create policy "Users can insert own meal plan items"
  on public.meal_plan_items for insert
  with check (exists (select 1 from public.meal_plans where id = meal_plan_id and user_id = auth.uid()));
create policy "Users can update own meal plan items"
  on public.meal_plan_items for update
  using (exists (select 1 from public.meal_plans where id = meal_plan_id and user_id = auth.uid()));
create policy "Users can delete own meal plan items"
  on public.meal_plan_items for delete
  using (exists (select 1 from public.meal_plans where id = meal_plan_id and user_id = auth.uid()));

-- meal_logs
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  meal_plan_item_id uuid references public.meal_plan_items(id) on delete set null,
  name text not null,
  calories integer not null,
  protein_g numeric(6,1) not null,
  carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null,
  eaten boolean not null default false,
  created_at timestamptz not null default now()
);

-- Prevent duplicate eaten entries for the same planned meal on the same day
create unique index meal_logs_item_date_idx
  on public.meal_logs(meal_plan_item_id, date)
  where meal_plan_item_id is not null;

alter table public.meal_logs enable row level security;

create policy "Users can view own meal logs"
  on public.meal_logs for select using (auth.uid() = user_id);
create policy "Users can insert own meal logs"
  on public.meal_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own meal logs"
  on public.meal_logs for update using (auth.uid() = user_id);
create policy "Users can delete own meal logs"
  on public.meal_logs for delete using (auth.uid() = user_id);
