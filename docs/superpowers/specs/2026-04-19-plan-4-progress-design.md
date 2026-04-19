# Fitness App — Plan 4: Progress Tracking Design Spec

**Goal:** Add a `/progress` page showing calorie trends, workout history, and manual weight tracking over a user-selected time range, rendered with Recharts.

**Architecture:** Server component fetches default 30-day window and passes data to `ProgressClient`, which handles time range switching via Supabase browser client. Weight entries are logged manually via upsert. No new API routes — RLS enforces data isolation throughout.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Supabase JS SDK, Jest + React Testing Library

---

## 1. Data Model

Single migration: `supabase/migrations/0005_weight_entries.sql`

### `weight_entries`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK | references `auth.users`, on delete cascade |
| `date` | date | |
| `weight_kg` | numeric(5,2) | |
| `created_at` | timestamptz | default now() |

- Unique constraint on `(user_id, date)` — one entry per day, upsert on conflict
- RLS: `user_id = auth.uid()` on all operations
- FK index on `user_id`

No other schema changes — calorie data comes from existing `meal_logs`, workout data from existing `workout_logs`.

---

## 2. Pages & Components

### `/progress` — `app/(app)/progress/page.tsx` (Server Component)

Fetches last 30 days of data for the authenticated user:
- **Calorie data**: `meal_logs` summed by date where `eaten = true` → `CalorieEntry[]`
- **Workout data**: `workout_logs` rows by date → `WorkoutEntry[]`
- **Weight data**: `weight_entries` ordered by date → `WeightEntry[]`
- **Targets**: `profiles` → `daily_calories` (via `calculateCalorieTargets`) and `target_weight_kg`

Passes to `ProgressClient`:
- `calorieData: CalorieEntry[]`
- `workoutData: WorkoutEntry[]`
- `weightData: WeightEntry[]`
- `calorieTarget: number | null`
- `targetWeight: number | null`
- `userId: string`

### `ProgressClient` — `app/(app)/progress/client.tsx` (Client Component)

**State:**
- `range: '1d' | '2d' | '7d' | '30d' | '90d'` — default `'30d'`
- `calorieData: CalorieEntry[]`
- `workoutData: WorkoutEntry[]`
- `weightData: WeightEntry[]`
- `weightInput: string`
- `isSavingWeight: boolean`
- `error: string | null`

**Behaviour:**
- On range change: compute `startDate` from range, re-query all three tables via Supabase browser client, update local state
- Weight log: number input + "Log weight" button; calls `supabase.from('weight_entries').upsert({ user_id, date: today, weight_kg }, { onConflict: 'user_id,date' })`; on success prepends/replaces entry in local `weightData`

**Renders:**
1. Page header: "Progress" + range selector tab strip (`Today / 2d / 7d / 30d / 90d`)
2. Weight log row: number input (step 0.1) + "Log weight" button
3. Error alert (`role="alert"`)
4. Three chart sections stacked vertically:
   - `<CalorieChart data={calorieData} target={calorieTarget} />`
   - `<WorkoutChart data={workoutData} />`
   - `<WeightChart data={weightData} target={targetWeight} />`

### `CalorieChart` — `components/progress/calorie-chart.tsx`

- Recharts `BarChart` — daily calorie totals as bars
- `ReferenceLine` at `calorieTarget` (dashed, ember orange)
- X-axis: date labels; Y-axis: kcal
- Empty state: "No meals logged in this period"

### `WorkoutChart` — `components/progress/workout-chart.tsx`

- Recharts `BarChart` — one bar per day: height 1 if completed, 0 if not
- Bars coloured: `text-primary` (ember) for completed, `text-muted` for missed
- Empty state: "No workouts logged in this period"

### `WeightChart` — `components/progress/weight-chart.tsx`

- Recharts `LineChart` — weight_kg over time
- `ReferenceLine` at `targetWeight` if set (dashed)
- X-axis: date labels; Y-axis: kg
- Empty state: "No weight entries yet — log your weight above"

---

## 3. Types (additions to `lib/types.ts`)

```typescript
export interface WeightEntry {
  id: string
  user_id: string
  date: string
  weight_kg: number
  created_at: string
}

export interface CalorieEntry {
  date: string
  calories: number
}

export interface WorkoutEntry {
  date: string
  completed: boolean
}
```

---

## 4. File Structure

```
app/(app)/progress/
  page.tsx          ← server component
  client.tsx        ← client component
components/progress/
  calorie-chart.tsx
  workout-chart.tsx
  weight-chart.tsx
lib/types.ts        ← extend with WeightEntry, CalorieEntry, WorkoutEntry
supabase/migrations/
  0005_weight_entries.sql
__tests__/progress/
  calorie-chart.test.tsx
  workout-chart.test.tsx
  weight-chart.test.tsx
  weight-log.test.tsx
```

---

## 5. Testing

**`__tests__/progress/calorie-chart.test.tsx`** (jsdom)
- Renders bars when data provided
- Renders empty state when data is empty

**`__tests__/progress/workout-chart.test.tsx`** (jsdom)
- Renders chart when data provided
- Renders empty state when data is empty

**`__tests__/progress/weight-chart.test.tsx`** (jsdom)
- Renders chart when data provided
- Renders empty state when data is empty

**`__tests__/progress/weight-log.test.tsx`** (jsdom)
- "Log weight" button calls supabase upsert with correct payload
- Button disabled while saving
- Shows error message on upsert failure

---

## 6. Error Handling

| Scenario | Behaviour |
|---|---|
| Range re-fetch fails | Inline error banner, previous data retained |
| Weight upsert fails | Error message shown, input value retained |
| No data for range | Empty state shown inside each chart component |
| Profile has no calorie target | Reference line omitted from CalorieChart |
| Profile has no target weight | Reference line omitted from WeightChart |
