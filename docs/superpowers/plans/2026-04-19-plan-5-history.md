# Plan History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/history` page showing all past (non-active) meal and workout plans grouped by week, with the ability to re-activate any archived plan as a fresh copy for the current week.

**Architecture:** Server component fetches non-active meal and workout plans with their items via Supabase embedded joins, groups them into `HistoryWeek[]` by `week_start_date`, and passes to `HistoryClient`. Re-activation is handled by `POST /api/history/reactivate` which archives the current active plan of that type and inserts a copy with `week_start_date` set to the current Monday. No schema changes needed — uses existing `meal_plans`, `meal_plan_items`, `workout_plans`, `workout_plan_items` tables.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase JS SDK, Jest + React Testing Library

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/types.ts` | Modify | Add `HistoryWeek` interface |
| `jest.config.ts` | Modify | Add `__tests__/history/**/*.test.tsx` to jsdom project |
| `app/api/history/reactivate/route.ts` | Create | POST handler — archive + copy plan |
| `__tests__/api/history/reactivate.test.ts` | Create | Route unit tests (node env) |
| `app/(app)/history/client.tsx` | Create | Client component — expand/collapse + re-activate |
| `__tests__/history/history-client.test.tsx` | Create | Component tests (jsdom env) |
| `app/(app)/history/page.tsx` | Create | Server component — fetch + group data |
| `app/(app)/layout.tsx` | Modify | Add History nav link |

---

## Task 1: Types + Jest Config

**Files:**
- Modify: `lib/types.ts`
- Modify: `jest.config.ts`

- [ ] **Step 1: Add `HistoryWeek` to `lib/types.ts`**

Append after the `WorkoutEntry` interface (line 136):

```typescript
export interface HistoryWeek {
  weekStart: string
  mealPlan?: MealPlan & { items: MealPlanItem[] }
  workoutPlan?: WorkoutPlan & { items: WorkoutPlanItem[] }
}
```

- [ ] **Step 2: Add history test pattern to `jest.config.ts` jsdom project**

In the jsdom project's `testMatch` array, add the history pattern after the progress line:

```typescript
// Before (jsdom testMatch):
testMatch: [
  '**/__tests__/onboarding/**/*.test.tsx',
  '**/__tests__/meals/**/*.test.tsx',
  '**/__tests__/workouts/**/*.test.tsx',
  '**/__tests__/settings/**/*.test.tsx',
  '**/__tests__/progress/**/*.test.tsx',
],

// After:
testMatch: [
  '**/__tests__/onboarding/**/*.test.tsx',
  '**/__tests__/meals/**/*.test.tsx',
  '**/__tests__/workouts/**/*.test.tsx',
  '**/__tests__/settings/**/*.test.tsx',
  '**/__tests__/progress/**/*.test.tsx',
  '**/__tests__/history/**/*.test.tsx',
],
```

Note: `__tests__/api/history/reactivate.test.ts` is already covered by the node project's `**/__tests__/api/**/*.test.ts` pattern — no change needed there.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run existing tests to confirm nothing broken**

```bash
npm test
```

Expected: all existing tests pass (112 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts jest.config.ts
git commit -m "feat(history): add HistoryWeek type and jest config"
```

---

## Task 2: POST /api/history/reactivate Route + Tests

**Files:**
- Create: `app/api/history/reactivate/route.ts`
- Create: `__tests__/api/history/reactivate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/history/reactivate.test.ts`:

```typescript
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/meal-utils', () => ({
  ...jest.requireActual('@/lib/meal-utils'),
  getCurrentWeekStart: jest.fn().mockReturnValue('2026-04-21'),
}))

import { POST } from '@/app/api/history/reactivate/route'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeRequest(body: object) {
  return new Request('http://localhost/api/history/reactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const MOCK_MEAL_PLAN = { id: 'mp-1', user_id: 'uid-1' }
const MOCK_NEW_MEAL_PLAN = {
  id: 'mp-new', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '',
}
const MOCK_MEAL_ITEMS = [
  { day_of_week: 'mon', meal_type: 'breakfast', name: 'Oats', calories: 300, protein_g: 10, carbs_g: 50, fat_g: 5 },
]

function makeMealSupabase(overrides: { planData?: object | null; newPlanError?: object | null } = {}) {
  const newPlanInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: overrides.newPlanError ? null : MOCK_NEW_MEAL_PLAN,
        error: overrides.newPlanError ?? null,
      }),
    }),
  })
  const archiveUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  })
  const itemsInsert = jest.fn().mockResolvedValue({ error: null })

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'meal_plans') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: overrides.planData !== undefined ? overrides.planData : MOCK_MEAL_PLAN,
                  error: null,
                }),
              }),
            }),
          }),
          update: archiveUpdate,
          insert: newPlanInsert,
        }
      }
      if (table === 'meal_plan_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: MOCK_MEAL_ITEMS, error: null }),
          }),
          insert: itemsInsert,
        }
      }
      return {}
    }),
  }

  return { supabase, newPlanInsert, archiveUpdate, itemsInsert }
}

const MOCK_WORKOUT_PLAN = { id: 'wp-1', user_id: 'uid-1' }
const MOCK_NEW_WORKOUT_PLAN = {
  id: 'wp-new', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '',
}
const MOCK_WORKOUT_ITEMS = [
  { day_of_week: 'mon', name: 'Push Day', exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight_kg: 60 }] },
]

function makeWorkoutSupabase() {
  const newPlanInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: MOCK_NEW_WORKOUT_PLAN, error: null }),
    }),
  })
  const archiveUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  })
  const itemsInsert = jest.fn().mockResolvedValue({ error: null })

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'workout_plans') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: MOCK_WORKOUT_PLAN, error: null }),
              }),
            }),
          }),
          update: archiveUpdate,
          insert: newPlanInsert,
        }
      }
      if (table === 'workout_plan_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: MOCK_WORKOUT_ITEMS, error: null }),
          }),
          insert: itemsInsert,
        }
      }
      return {}
    }),
  }

  return { supabase, newPlanInsert, archiveUpdate, itemsInsert }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/history/reactivate', () => {
  it('returns 400 for invalid type', async () => {
    const { supabase } = makeMealSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'invalid', planId: 'mp-1' }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid type')
  })

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
      from: jest.fn(),
    }
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'mp-1' }) as any)
    expect(res.status).toBe(401)
  })

  it('returns 404 when meal plan not found', async () => {
    const { supabase } = makeMealSupabase({ planData: null })
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'nonexistent' }) as any)
    expect(res.status).toBe(404)
  })

  it('archives current active meal plan and creates a new copy with current week start', async () => {
    const { supabase, archiveUpdate, newPlanInsert, itemsInsert } = makeMealSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'mp-1' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(archiveUpdate).toHaveBeenCalled()
    expect(newPlanInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active' })
    )
    expect(itemsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ meal_plan_id: 'mp-new', day_of_week: 'mon' }),
      ])
    )
  })

  it('archives current active workout plan and creates a new copy with current week start', async () => {
    const { supabase, archiveUpdate, newPlanInsert, itemsInsert } = makeWorkoutSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'workout', planId: 'wp-1' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(archiveUpdate).toHaveBeenCalled()
    expect(newPlanInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active' })
    )
    expect(itemsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workout_plan_id: 'wp-new', day_of_week: 'mon' }),
      ])
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="reactivate" --passWithNoTests
```

Expected: FAIL — `Cannot find module '@/app/api/history/reactivate/route'`

- [ ] **Step 3: Create the route handler**

Create `app/api/history/reactivate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekStart } from '@/lib/meal-utils'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, planId } = await request.json()

  if (type !== 'meal' && type !== 'workout') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const newWeekStart = getCurrentWeekStart()

  if (type === 'meal') {
    const { data: plan } = await supabase
      .from('meal_plans')
      .select('id, user_id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const { data: items } = await supabase
      .from('meal_plan_items')
      .select('day_of_week, meal_type, name, calories, protein_g, carbs_g, fat_g')
      .eq('meal_plan_id', planId)

    await supabase
      .from('meal_plans')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { data: newPlan, error: newPlanError } = await supabase
      .from('meal_plans')
      .insert({ user_id: user.id, week_start_date: newWeekStart, status: 'active' })
      .select()
      .single()

    if (newPlanError || !newPlan) {
      return NextResponse.json({ error: 'Failed to create new plan' }, { status: 500 })
    }

    const newItems = (items ?? []).map(item => ({ ...item, meal_plan_id: newPlan.id }))
    if (newItems.length > 0) {
      const { error: itemsError } = await supabase.from('meal_plan_items').insert(newItems)
      if (itemsError) {
        return NextResponse.json({ error: 'Failed to copy plan items' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  }

  // workout
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, user_id')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const { data: items } = await supabase
    .from('workout_plan_items')
    .select('day_of_week, name, exercises')
    .eq('workout_plan_id', planId)

  await supabase
    .from('workout_plans')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { data: newPlan, error: newPlanError } = await supabase
    .from('workout_plans')
    .insert({ user_id: user.id, week_start_date: newWeekStart, status: 'active' })
    .select()
    .single()

  if (newPlanError || !newPlan) {
    return NextResponse.json({ error: 'Failed to create new plan' }, { status: 500 })
  }

  const newItems = (items ?? []).map(item => ({ ...item, workout_plan_id: newPlan.id }))
  if (newItems.length > 0) {
    const { error: itemsError } = await supabase.from('workout_plan_items').insert(newItems)
    if (itemsError) {
      return NextResponse.json({ error: 'Failed to copy plan items' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="reactivate"
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all 117 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/history/reactivate/route.ts __tests__/api/history/reactivate.test.ts
git commit -m "feat(history): add POST /api/history/reactivate route"
```

---

## Task 3: HistoryClient Component + Tests

**Files:**
- Create: `app/(app)/history/client.tsx`
- Create: `__tests__/history/history-client.test.tsx`

**Note:** Invoke the `frontend-design` skill before writing the component to guide the visual implementation.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/history/history-client.test.tsx`:

```typescript
jest.mock('@/lib/supabase/client')

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HistoryClient from '@/app/(app)/history/client'
import type { HistoryWeek } from '@/lib/types'

const MOCK_WEEKS: HistoryWeek[] = [
  {
    weekStart: '2026-04-07',
    mealPlan: {
      id: 'mp-1',
      user_id: 'uid-1',
      week_start_date: '2026-04-07',
      status: 'archived',
      created_at: '',
      items: [
        {
          id: 'mpi-1',
          meal_plan_id: 'mp-1',
          day_of_week: 'mon',
          meal_type: 'breakfast',
          name: 'Oats',
          calories: 300,
          protein_g: 10,
          carbs_g: 50,
          fat_g: 5,
        },
      ],
    },
    workoutPlan: {
      id: 'wp-1',
      user_id: 'uid-1',
      week_start_date: '2026-04-07',
      status: 'archived',
      created_at: '',
      items: [
        {
          id: 'wpi-1',
          workout_plan_id: 'wp-1',
          day_of_week: 'mon',
          name: 'Push Day',
          exercises: [],
        },
      ],
    },
  },
]

beforeEach(() => jest.clearAllMocks())

describe('HistoryClient', () => {
  it('renders a week row for each week', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    expect(screen.getByText(/Apr 7/)).toBeInTheDocument()
  })

  it('shows empty state when weeks is empty', () => {
    render(<HistoryClient weeks={[]} userId="uid-1" />)
    expect(screen.getByText(/No past plans yet/)).toBeInTheDocument()
  })

  it('plan cards are hidden before expanding', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    expect(screen.queryByText('Meal Plan')).not.toBeInTheDocument()
    expect(screen.queryByText('Workout Plan')).not.toBeInTheDocument()
  })

  it('expands week row to show plan cards on click', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))
    expect(screen.getByText('Meal Plan')).toBeInTheDocument()
    expect(screen.getByText('Workout Plan')).toBeInTheDocument()
  })

  it('collapses week row on second click', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    const toggle = screen.getByRole('button', { name: /Apr 7/ })
    fireEvent.click(toggle)
    expect(screen.getByText('Meal Plan')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('Meal Plan')).not.toBeInTheDocument()
  })

  it('calls reactivate API with correct payload when Re-activate clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    })

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0]) // first Re-activate = meal plan

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/history/reactivate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"meal"'),
        })
      )
    })
  })

  it('shows error alert on reactivation failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Server error' }),
    })

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    })
  })

  it('disables Re-activate button while reactivating', async () => {
    let resolveReactivate!: (value: unknown) => void
    global.fetch = jest.fn().mockReturnValue(
      new Promise(resolve => { resolveReactivate = resolve })
    )

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Re-activating/ })[0]).toBeDisabled()
    })

    resolveReactivate({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="history-client"
```

Expected: FAIL — `Cannot find module '@/app/(app)/history/client'`

- [ ] **Step 3: Create the HistoryClient component**

**Invoke `frontend-design` skill before writing this file** to determine the visual direction.

Create `app/(app)/history/client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import type { HistoryWeek } from '@/lib/types'

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)} – ${fmt(end)}`
}

interface Props {
  weeks: HistoryWeek[]
  userId: string
}

export default function HistoryClient({ weeks: initialWeeks, userId: _userId }: Props) {
  const [weeks, setWeeks] = useState<HistoryWeek[]>(initialWeeks)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (weekStart: string) => {
    setExpandedWeek(prev => (prev === weekStart ? null : weekStart))
  }

  const handleReactivate = async (type: 'meal' | 'workout', planId: string, weekStart: string) => {
    setReactivating(planId)
    setError(null)

    const res = await fetch('/api/history/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, planId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Re-activation failed — try again.')
      setReactivating(null)
      return
    }

    setWeeks(prev =>
      prev
        .map(w => {
          if (w.weekStart !== weekStart) return w
          const updated = { ...w }
          if (type === 'meal') delete updated.mealPlan
          else delete updated.workoutPlan
          return updated
        })
        .filter(w => w.mealPlan !== undefined || w.workoutPlan !== undefined)
    )
    setReactivating(null)
  }

  if (weeks.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-display font-bold mb-8">History</h1>
        <p className="text-muted-foreground">
          No past plans yet — your history will appear here once a week rolls over.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-display font-bold mb-8">History</h1>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {weeks.map(week => (
          <div key={week.weekStart} className="border border-border rounded-lg overflow-hidden bg-card">
            <button
              onClick={() => handleToggle(week.weekStart)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-accent transition-colors"
              aria-expanded={expandedWeek === week.weekStart}
            >
              <span>{formatWeekRange(week.weekStart)}</span>
              <span className="text-muted-foreground text-xs">
                {expandedWeek === week.weekStart ? '▲' : '▼'}
              </span>
            </button>

            {expandedWeek === week.weekStart && (
              <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border">
                {week.mealPlan && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Meal Plan</h3>
                    <ul className="space-y-1">
                      {week.mealPlan.items.map(item => (
                        <li key={item.id} className="text-xs text-muted-foreground">
                          <span className="capitalize">{item.day_of_week}</span>
                          {' '}— {item.name}{' '}
                          <span className="text-muted-foreground/60">({item.calories} kcal)</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleReactivate('meal', week.mealPlan!.id, week.weekStart)}
                      disabled={reactivating === week.mealPlan.id}
                      aria-busy={reactivating === week.mealPlan.id}
                      className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {reactivating === week.mealPlan.id ? 'Re-activating…' : 'Re-activate'}
                    </button>
                  </div>
                )}

                {week.workoutPlan && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Workout Plan</h3>
                    <ul className="space-y-1">
                      {week.workoutPlan.items.map(item => (
                        <li key={item.id} className="text-xs text-muted-foreground">
                          <span className="capitalize">{item.day_of_week}</span>
                          {' '}— {item.name}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleReactivate('workout', week.workoutPlan!.id, week.weekStart)}
                      disabled={reactivating === week.workoutPlan.id}
                      aria-busy={reactivating === week.workoutPlan.id}
                      className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {reactivating === week.workoutPlan.id ? 'Re-activating…' : 'Re-activate'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="history-client"
```

Expected: PASS — 7 tests passing.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all 124 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/history/client.tsx __tests__/history/history-client.test.tsx
git commit -m "feat(history): add HistoryClient component"
```

---

## Task 4: /history Server Page + Nav Link

**Files:**
- Create: `app/(app)/history/page.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create the server page**

Create `app/(app)/history/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistoryClient from './client'
import type { HistoryWeek, MealPlan, MealPlanItem, WorkoutPlan, WorkoutPlanItem } from '@/lib/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: mealPlans }, { data: workoutPlans }] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('id, user_id, week_start_date, status, created_at, meal_plan_items(*)')
      .eq('user_id', user.id)
      .neq('status', 'active')
      .order('week_start_date', { ascending: false }),
    supabase
      .from('workout_plans')
      .select('id, user_id, week_start_date, status, created_at, workout_plan_items(*)')
      .eq('user_id', user.id)
      .neq('status', 'active')
      .order('week_start_date', { ascending: false }),
  ])

  const weekMap = new Map<string, HistoryWeek>()

  for (const plan of mealPlans ?? []) {
    const { meal_plan_items: items, ...rest } = plan as MealPlan & { meal_plan_items: MealPlanItem[] }
    const week = weekMap.get(plan.week_start_date) ?? { weekStart: plan.week_start_date }
    week.mealPlan = { ...rest, items: items ?? [] }
    weekMap.set(plan.week_start_date, week)
  }

  for (const plan of workoutPlans ?? []) {
    const { workout_plan_items: items, ...rest } = plan as WorkoutPlan & { workout_plan_items: WorkoutPlanItem[] }
    const week = weekMap.get(plan.week_start_date) ?? { weekStart: plan.week_start_date }
    week.workoutPlan = { ...rest, items: items ?? [] }
    weekMap.set(plan.week_start_date, week)
  }

  const weeks: HistoryWeek[] = Array.from(weekMap.values()).sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  )

  return <HistoryClient weeks={weeks} userId={user.id} />
}
```

- [ ] **Step 2: Add the History nav link to `app/(app)/layout.tsx`**

In the `NAV` array in `app/(app)/layout.tsx`, add a History entry after the Progress entry (after line 43):

```typescript
// Add this entry after the Progress entry:
{
  href: '/history',
  label: 'History',
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
},
```

The `NAV` array should now read: Dashboard → Meals → Workouts → Progress → History → Settings.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all 124 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/history/page.tsx app/(app)/layout.tsx
git commit -m "feat(history): add /history server page and nav link"
```
