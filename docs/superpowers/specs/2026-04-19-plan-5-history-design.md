# Fitness App — Plan 5: Plan History Design Spec

**Goal:** Add a `/history` page showing past meal and workout plans grouped by week, with the ability to re-activate any archived plan as a fresh copy for the current week.

**Architecture:** Server component fetches all non-active plans with items, groups by `week_start_date` into `HistoryWeek[]`, passes to `HistoryClient`. Re-activation handled by `POST /api/history/reactivate` — archives current active plan of that type, then creates a copy with today's Monday as the new week start. No schema changes needed.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase JS SDK, Jest + React Testing Library

---

## 1. Data Model

No new migrations. Uses existing tables:

- `meal_plans` — `id`, `user_id`, `week_start_date`, `status` (`proposed` | `active` | `archived`)
- `meal_plan_items` — `id`, `meal_plan_id`, `day_of_week`, `name`, `calories`, `meals` (jsonb)
- `workout_plans` — `id`, `user_id`, `week_start_date`, `status`
- `workout_plan_items` — `id`, `workout_plan_id`, `day_of_week`, `name`, `exercises` (jsonb)

---

## 2. Types (additions to `lib/types.ts`)

```typescript
export interface HistoryWeek {
  weekStart: string
  mealPlan?: MealPlan & { items: MealPlanItem[] }
  workoutPlan?: WorkoutPlan & { items: WorkoutPlanItem[] }
}
```

(`MealPlan`, `MealPlanItem`, `WorkoutPlan`, `WorkoutPlanItem` already exist.)

---

## 3. Pages & Components

### `/history` — `app/(app)/history/page.tsx` (Server Component)

Fetches for the authenticated user:
- All `meal_plans` where `status != 'active'`, ordered by `week_start_date DESC`, joined with `meal_plan_items`
- All `workout_plans` where `status != 'active'`, ordered by `week_start_date DESC`, joined with `workout_plan_items`

Groups both into `HistoryWeek[]` keyed by `week_start_date`. Passes to `HistoryClient`:
- `weeks: HistoryWeek[]`
- `userId: string`

### `HistoryClient` — `app/(app)/history/client.tsx` (Client Component)

**State:**
- `weeks: HistoryWeek[]`
- `expandedWeek: string | null` — default `null` (all collapsed)
- `reactivating: string | null` — planId currently being reactivated
- `error: string | null`

**Renders:**
1. Page header: "History"
2. Error alert (`role="alert"`) if `error` is set
3. Vertical list of week rows, sorted by `weekStart` descending
4. Each row:
   - Header: formatted week date range (e.g. "Apr 7 – Apr 13") + expand/collapse toggle
   - When expanded: up to two side-by-side cards:
     - **Meal Plan card** — lists items by day (name + calories per item); "Re-activate" button
     - **Workout Plan card** — lists items by day (name + exercises); "Re-activate" button
   - If only one plan type exists for a week, only that card is shown
5. Empty state: "No past plans yet — your history will appear here once a week rolls over."

**Re-activation behaviour:**
- Clicking "Re-activate" on a card calls `POST /api/history/reactivate` with `{ type: 'meal' | 'workout', planId }`
- On success: removes the reactivated plan from `weeks` local state (it's now active, not history)
- On failure: sets `error`, re-enables the button

### `/api/history/reactivate` — `app/api/history/reactivate/route.ts`

Accepts `POST` with JSON body `{ type: 'meal' | 'workout', planId: string }`.

Steps:
1. Validate `type` — return 400 if invalid
2. Fetch the source plan + its items (verify ownership via `user_id = auth.uid()`)
3. Archive current active plan of that type: `UPDATE ... SET status = 'archived' WHERE user_id = ? AND status = 'active'`
4. Compute `newWeekStart` = Monday of the current week
5. Insert new plan with `status = 'active'`, `week_start_date = newWeekStart`
6. Insert copies of all items linked to the new plan id
7. Return `{ success: true }`

---

## 4. File Structure

```
app/(app)/history/
  page.tsx          ← server component
  client.tsx        ← client component
app/api/history/
  reactivate/
    route.ts        ← reactivate handler
lib/types.ts        ← extend with HistoryWeek
__tests__/history/
  history-client.test.tsx
  reactivate.test.ts
```

---

## 5. Testing

**`__tests__/history/history-client.test.tsx`** (jsdom)
- Renders a row for each week in `weeks`
- Clicking a row header expands it to show plan cards
- Clicking again collapses it
- Shows empty state when `weeks` is empty
- "Re-activate" button calls the API and removes the plan from local state on success
- Shows error alert on reactivation failure

**`__tests__/history/reactivate.test.ts`** (node)
- Returns 400 for invalid `type`
- Archives current active plan of the given type
- Creates a new plan copy with `week_start_date` = current Monday and `status = 'active'`
- Copies all items to the new plan
- Returns `{ success: true }` on success

---

## 6. Error Handling

| Scenario | Behaviour |
|---|---|
| Reactivate API fails | Inline error banner shown, button re-enabled |
| No history | Empty state: "No past plans yet — your history will appear here once a week rolls over." |
| Week has only meal or only workout plan | Only that card shown, no error |
| Source plan not found / wrong user | 404 returned, error banner shown |
