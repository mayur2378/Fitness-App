# Fitness App — Plan 3: Workouts + Settings Design Spec

**Goal:** Add AI-generated weekly workout plans with per-exercise weight logging, and a Settings page for editing profile fields and login credentials.

**Architecture:** One new API route (`POST /api/workouts/generate`) calls Claude server-side to produce the weekly plan. Workout logging and profile updates write directly from the browser client via Supabase RLS — no server intermediary needed. Settings is a single client component with two sections: Profile and Security.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, @anthropic-ai/sdk, Supabase JS SDK, Jest + React Testing Library

---

## 1. Data Model

Single migration: `supabase/migrations/0004_workouts.sql`

### `workout_plans`
Mirrors `meal_plans` exactly.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK | references `auth.users`, on delete cascade |
| `week_start_date` | date | always a Monday |
| `status` | text | `proposed` / `active` / `archived` |
| `created_at` | timestamptz | default now() |

RLS: `user_id = auth.uid()` on all operations.

### `workout_plan_items`
One row per workout day Claude assigns. Not all 7 days have a row — only scheduled training days.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workout_plan_id` | uuid FK | references `workout_plans`, on delete cascade |
| `day_of_week` | text | enum: `mon` / `tue` / `wed` / `thu` / `fri` / `sat` / `sun` |
| `name` | text | e.g. "Push Day", "Upper Body" |
| `exercises` | jsonb | array of `{name, sets, reps, weight_kg}` |

RLS: via join — `workout_plan_id in (select id from workout_plans where user_id = auth.uid())`.
FK index on `workout_plan_id`.

### `workout_logs`
One row per completed workout day. Stores both completion state and per-exercise actuals.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | references `auth.users`, on delete cascade |
| `date` | date | local calendar date |
| `workout_plan_item_id` | uuid FK (nullable) | references `workout_plan_items` |
| `completed` | boolean | default false |
| `exercises_logged` | jsonb | array of `{name, actual_sets, actual_reps, actual_weight_kg}` |
| `notes` | text (nullable) | |
| `created_at` | timestamptz | default now() |

RLS: `user_id = auth.uid()` on all operations.
Partial unique index: `(workout_plan_item_id, date) where workout_plan_item_id is not null` — prevents duplicate logs for the same workout day.
FK index on `user_id` and `workout_plan_item_id`.

---

## 2. API Routes

### `POST /api/workouts/generate`

**Auth:** Validates Supabase session server-side. Returns 401 if unauthenticated.

**Steps:**
1. Fetch user profile: `goal`, `experience_level`, `workout_days_per_week`
2. Call Claude once with a directive JSON-only prompt
3. Parse response — strip code fences, JSON.parse
4. Insert new `workout_plans` row
5. Insert all `workout_plan_items` rows
6. Archive previous active plans (`.neq('id', newPlan.id)`) — only after successful item insert
7. Return `{ plan, items }`

**Claude prompt contract:**
- Input: `goal`, `experience_level`, `workout_days_per_week`
- Output: JSON array of workout day objects:
  ```json
  [
    {
      "day": "mon",
      "name": "Push Day",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": 8, "weight_kg": 60 }
      ]
    }
  ]
  ```
- Exactly `workout_days_per_week` items in the array
- Claude assigns days with sensible rest day distribution
- `experience_level` guides starting weights: beginner → lighter, advanced → heavier
- `goal = "lose"` → more circuit/HIIT structure; `goal = "gain"` → heavier compound lifts; `goal = "maintain"` → balanced mix

**Error handling:** Returns 500 with `{ error: "Workout plan generation failed — try again." }` on Claude failure, parse failure, or DB insert failure. No partial data left in DB on failure.

### Settings — No API routes

- Profile update: `supabase.from('profiles').update(data).eq('user_id', user.id)` from browser client
- Calorie recalculation: calls existing `POST /api/calorie/calculate` when prompted after goal/weight change
- Email update: `supabase.auth.updateUser({ email: newEmail })`
- Password update: `supabase.auth.updateUser({ password: newPassword })`

### Workout logging — No API routes

- Log workout: `supabase.from('workout_logs').insert(...)` from browser client
- RLS enforces `user_id = auth.uid()` — no server intermediary needed

---

## 3. Pages & Components

### `/workouts` — `app/(app)/workouts/page.tsx` (Server Component)

Fetches:
- Active workout plan + items for the current user
- Today's workout log (if any) — to show completed state on page load

Passes to `WorkoutsClient`:
- `activePlan: WorkoutPlan | null`
- `items: WorkoutPlanItem[]`
- `loggedItemIds: string[]` — workout_plan_item_ids logged today
- `userId: string`

### `WorkoutsClient` — `app/(app)/workouts/client.tsx` (Client Component)

State:
- `items` — local copy, used for optimistic updates
- `loggedIds: Set<string>` — which items are logged today
- `isGenerating: boolean`
- `savingId: string | null` — which card is currently saving a log
- `error: string | null`

Renders:
- Page header with title and "Generate plan" / "Regenerate plan" button
- Error alert
- If no active plan: empty state prompt
- If active plan: 7-column week row. Each day either shows a `WorkoutCard` (if an item exists for that day) or a small "Rest" chip

### `WorkoutCard` — `components/workouts/workout-card.tsx` (Client Component)

Props: `item`, `isLogged`, `onSave(log: WorkoutLogPayload) => void`, `isSaving`

Two display modes, toggled by local state:

**View mode (default):**
- Day label + workout name in header
- Exercise list: `Name · Sets × Reps · Target: Xkg` per row
- "Log workout" button (disabled if already logged today)
- Logged state: "✓ Completed" badge, logged values shown

**Log mode (after clicking "Log workout"):**
- Same exercise list but each row has three compact number inputs: actual sets, actual reps, actual weight (kg) — pre-filled with target values
- Optional notes textarea
- "Save" and "Cancel" buttons
- On save: calls `onSave` with `{ workout_plan_item_id, date, completed: true, exercises_logged, notes }`

### `/settings` — `app/(app)/settings/page.tsx` (Client Component)

On mount: fetches `supabase.auth.getUser()` and `supabase.from('profiles').select('*')`.

Two sections:

**Profile section:**
- Form with all profile fields: sex, age, weight_kg, height_cm, goal, target_weight_kg, activity_level, experience_level, workout_days_per_week, cuisine_preference, dietary_restrictions
- Same field styles as onboarding (sex toggle buttons, card selectors for goal/activity)
- On submit: `supabase.from('profiles').update(...)`
- If `goal` or `weight_kg` changed from original values: shows inline prompt after save — "Your calorie targets may have changed. Recalculate?" with **Yes** and **Skip** buttons. Yes calls `POST /api/calorie/calculate` and displays the new targets inline.

**Security section:**
- Email subsection: current email shown, input for new email, "Update email" button → `supabase.auth.updateUser({ email })`
- Password subsection: new password input + confirm password input, "Update password" button → `supabase.auth.updateUser({ password })` (validates both inputs match before calling)
- Each subsection shows its own success/error message

---

## 4. Types (additions to `lib/types.ts`)

```typescript
export interface WorkoutPlan {
  id: string
  user_id: string
  week_start_date: string
  status: PlanStatus
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  weight_kg: number
}

export interface WorkoutPlanItem {
  id: string
  workout_plan_id: string
  day_of_week: DayOfWeek
  name: string
  exercises: Exercise[]
}

export interface ExerciseLog {
  name: string
  actual_sets: number
  actual_reps: number
  actual_weight_kg: number
}

export interface WorkoutLog {
  id: string
  user_id: string
  date: string
  workout_plan_item_id: string | null
  completed: boolean
  exercises_logged: ExerciseLog[]
  notes: string | null
  created_at: string
}
```

---

## 5. File Structure

```
app/
  api/workouts/generate/route.ts
  (app)/
    workouts/
      page.tsx                          ← server component
      client.tsx                        ← client component
    settings/
      page.tsx                          ← client component
components/
  workouts/
    workout-card.tsx
lib/
  types.ts                              ← extend with workout types
supabase/migrations/
  0004_workouts.sql
__tests__/
  api/workouts-generate.test.ts
  workouts/workout-card.test.tsx
  settings/profile-form.test.tsx
  settings/security-form.test.tsx
```

---

## 6. Testing

**`__tests__/api/workouts-generate.test.ts`** (node environment)
- 401 when unauthenticated
- 404 when no profile
- 200 with correct `{ plan, items }` structure on success
- 500 when Claude returns invalid JSON
- 500 when DB insert fails — no orphaned plan left behind

**`__tests__/workouts/workout-card.test.tsx`** (jsdom environment)
- Renders exercise list with name, sets, reps, weight
- Clicking "Log workout" switches to log mode
- Log mode inputs pre-filled with target values
- Cancel returns to view mode
- Save calls onSave with correct payload
- Shows "✓ Completed" state when isLogged=true
- "Log workout" button disabled when isLogged=true

**`__tests__/settings/profile-form.test.tsx`** (jsdom environment)
- Renders all fields pre-filled from profile data
- Shows recalculate prompt when goal field changes and form is saved
- Does not show recalculate prompt when unrelated field changes

**`__tests__/settings/security-form.test.tsx`** (jsdom environment)
- Shows error when passwords don't match
- Calls updateUser with correct payload on valid submit
- Shows success message after successful email/password update

---

## 7. Error Handling

| Scenario | Behaviour |
|---|---|
| Claude unavailable during generate | 500 returned; no partial data saved; client shows error banner |
| Claude returns malformed JSON | Same as above — `stripCodeFences` + try/catch |
| Profile update fails | Inline error message in profile section |
| Email already in use | Supabase returns error; shown inline in security section |
| Passwords don't match | Client-side validation before calling Supabase |
| Workout log save fails | Optimistic update rolled back; error message shown on card |
| No active workout plan | Empty state with "Generate workout plan" prompt |
