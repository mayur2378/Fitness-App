# Fitness App — Plan 3: Workouts + Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-generated weekly workout plans with per-exercise weight logging, and a Settings page for editing profile fields and login credentials.

**Architecture:** One new API route (`POST /api/workouts/generate`) calls Claude server-side using the same `callClaude` wrapper and `stripCodeFences` pattern as the meal route. Workout logging and profile updates write directly from the browser client via Supabase RLS. The `/settings` page is a server component that fetches the profile and passes it to two client-side form components (`ProfileForm`, `SecurityForm`).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, @anthropic-ai/sdk, Supabase JS SDK, Jest + React Testing Library

---

## File Structure

```
app/api/workouts/generate/route.ts     CREATE — workout plan generation API
app/(app)/workouts/page.tsx            MODIFY — replace placeholder with server component
app/(app)/workouts/client.tsx          CREATE — interactive grid + log workout
app/(app)/settings/page.tsx            MODIFY — replace placeholder with server component
components/workouts/workout-card.tsx   CREATE — single day card with log mode
components/settings/profile-form.tsx   CREATE — all profile fields in one form
components/settings/security-form.tsx  CREATE — email + password update
lib/types.ts                           MODIFY — add workout types
jest.config.ts                         MODIFY — add workouts + settings test dirs
supabase/migrations/0004_workouts.sql  CREATE — three new tables + RLS
__tests__/api/workouts-generate.test.ts
__tests__/workouts/workout-card.test.tsx
__tests__/settings/profile-form.test.tsx
__tests__/settings/security-form.test.tsx
```

---

## Task 1: Extend Types + DB Migration + Jest Config

**Files:**
- Modify: `lib/types.ts`
- Create: `supabase/migrations/0004_workouts.sql`
- Modify: `jest.config.ts`

- [ ] **Step 1: Add workout types to `lib/types.ts`**

Append these exports after the `MealLog` interface:

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

export interface WorkoutLogPayload {
  workout_plan_item_id: string
  date: string
  completed: boolean
  exercises_logged: ExerciseLog[]
  notes: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v __tests__`
Expected: no errors

- [ ] **Step 3: Create `supabase/migrations/0004_workouts.sql`**

```sql
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
```

- [ ] **Step 4: Apply migration in Supabase dashboard**

Open Supabase dashboard → SQL Editor → paste the full contents of `supabase/migrations/0004_workouts.sql` → Run.
Expected: "Success. No rows returned." Verify three new tables appear in Table Editor: `workout_plans`, `workout_plan_items`, `workout_logs`.

- [ ] **Step 5: Update `jest.config.ts` to include new test directories**

Add `'**/__tests__/workouts/**/*.test.tsx'` and `'**/__tests__/settings/**/*.test.tsx'` to the jsdom project's `testMatch`:

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const sharedTransform = {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      jsx: 'react-jsx',
      esModuleInterop: true,
      module: 'commonjs',
    },
  }],
}

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/lib/**/*.test.ts',
        '**/__tests__/api/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: sharedTransform,
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/__tests__/onboarding/**/*.test.tsx',
        '**/__tests__/meals/**/*.test.tsx',
        '**/__tests__/workouts/**/*.test.tsx',
        '**/__tests__/settings/**/*.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: sharedTransform,
    },
  ],
}

export default createJestConfig(config)
```

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts supabase/migrations/0004_workouts.sql jest.config.ts
git commit -m "feat: add workout types, migration, and extend jest config"
```

---

## Task 2: POST /api/workouts/generate Route + Tests

**Files:**
- Create: `app/api/workouts/generate/route.ts`
- Create: `__tests__/api/workouts-generate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/workouts-generate.test.ts`:

```typescript
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/claude')
jest.mock('@/lib/meal-utils', () => ({
  ...jest.requireActual('@/lib/meal-utils'),
  getCurrentWeekStart: jest.fn().mockReturnValue('2026-04-21'),
}))

import { POST } from '@/app/api/workouts/generate/route'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>

const MOCK_PROFILE = {
  goal: 'lose',
  experience_level: 'beginner',
  workout_days_per_week: 3,
}

const MOCK_PLAN_DAYS = [
  {
    day: 'mon',
    name: 'Full Body A',
    exercises: [
      { name: 'Squat', sets: 3, reps: 10, weight_kg: 40 },
      { name: 'Push-Up', sets: 3, reps: 12, weight_kg: 0 },
    ],
  },
  {
    day: 'wed',
    name: 'Full Body B',
    exercises: [{ name: 'Deadlift', sets: 3, reps: 10, weight_kg: 50 }],
  },
  {
    day: 'fri',
    name: 'Full Body C',
    exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight_kg: 30 }],
  },
]

function makeMockSupabase(itemsInsertError: { message: string } | null = null) {
  const mockPlan = { id: 'plan-uuid', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '' }
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }) },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
            }),
          }),
        }
      }
      if (table === 'workout_plans') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'workout_plan_items') {
        return {
          insert: jest.fn().mockResolvedValue({ error: itemsInsertError }),
        }
      }
      return {}
    }),
  }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/workouts/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never)
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when profile not found', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    } as never)
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Profile not found' })
  })

  it('returns 200 with plan and items on success', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    mockCallClaude.mockResolvedValueOnce(JSON.stringify(MOCK_PLAN_DAYS))
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan).toBeDefined()
    expect(body.plan.id).toBe('plan-uuid')
    expect(body.items).toHaveLength(3)
    expect(body.items[0].day_of_week).toBe('mon')
    expect(body.items[0].exercises).toHaveLength(2)
  })

  it('returns 500 when Claude returns invalid JSON', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    mockCallClaude.mockResolvedValueOnce('not valid json {{}')
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Workout plan generation failed — try again.' })
  })

  it('returns 500 and deletes plan when item insert fails', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ message: 'insert failed' }) as never)
    mockCallClaude.mockResolvedValueOnce(JSON.stringify(MOCK_PLAN_DAYS))
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Workout plan generation failed — try again.' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/workouts-generate.test.ts --passWithNoTests`
Expected: FAIL — "Cannot find module '@/app/api/workouts/generate/route'"

- [ ] **Step 3: Create `app/api/workouts/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'
import { getCurrentWeekStart } from '@/lib/meal-utils'
import type { DayOfWeek } from '@/lib/types'

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

type WorkoutDayPayload = {
  day: string
  name: string
  exercises: { name: string; sets: number; reps: number; weight_kg: number }[]
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('goal, experience_level, workout_days_per_week')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const weightGuidance =
    profile.experience_level === 'beginner'
      ? 'Beginner: lighter weights, 3 sets, 10-12 reps, focus on form and compound movements'
      : profile.experience_level === 'intermediate'
        ? 'Intermediate: moderate weights, 3-4 sets, 8-10 reps, progressive overload'
        : 'Advanced: heavier weights, 4-5 sets, 5-8 reps, periodised programming'

  const goalGuidance =
    profile.goal === 'lose'
      ? 'Fat loss goal: include circuit/HIIT elements, supersets, shorter rest periods'
      : profile.goal === 'gain'
        ? 'Muscle gain goal: focus on heavy compound lifts (squat, deadlift, bench press, barbell row)'
        : 'Maintenance goal: balanced mix of strength and conditioning work'

  const prompt = `You are a personal trainer. Output ONLY a JSON array with no other text, explanation, or markdown.

Generate a ${profile.workout_days_per_week}-day weekly workout plan for a ${profile.experience_level} with goal: ${profile.goal}.

RULES (non-negotiable):
1. Exactly ${profile.workout_days_per_week} workout day objects in the array
2. Spread workout days across Mon–Sun with sensible rest days between sessions (e.g. not back-to-back every day)
3. Each object: "day" (mon/tue/wed/thu/fri/sat/sun), "name" (e.g. "Push Day"), "exercises" array
4. Each exercise: "name" (string), "sets" (number), "reps" (number), "weight_kg" (number, 0 for bodyweight)
5. 4-6 exercises per workout day
6. ${weightGuidance}
7. ${goalGuidance}

Output this exact structure with no other text:
[{"day":"mon","name":"Push Day","exercises":[{"name":"Bench Press","sets":3,"reps":10,"weight_kg":60},{"name":"Overhead Press","sets":3,"reps":10,"weight_kg":30}]},{"day":"wed","name":"Pull Day","exercises":[...]}]`

  let days: WorkoutDayPayload[]
  try {
    const raw = await callClaude(prompt, 2048)
    console.log('[workouts/generate] raw (first 200 chars):', raw.slice(0, 200))
    days = JSON.parse(stripCodeFences(raw))
    console.log('[workouts/generate] parsed days:', days.length)
  } catch (err) {
    console.error('[workouts/generate] Claude step failed:', err)
    return NextResponse.json({ error: 'Workout plan generation failed — try again.' }, { status: 500 })
  }

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .insert({ user_id: user.id, week_start_date: getCurrentWeekStart(), status: 'active' })
    .select()
    .single()

  if (planError || !plan) {
    console.error('[workouts/generate] plan insert failed:', planError)
    return NextResponse.json({ error: 'Workout plan generation failed — try again.' }, { status: 500 })
  }

  const items = days.map(d => ({
    workout_plan_id: plan.id,
    day_of_week: d.day as DayOfWeek,
    name: d.name,
    exercises: d.exercises,
  }))

  const { error: itemsError } = await supabase.from('workout_plan_items').insert(items)

  if (itemsError) {
    console.error('[workouts/generate] items insert failed:', itemsError)
    await supabase.from('workout_plans').delete().eq('id', plan.id)
    return NextResponse.json({ error: 'Workout plan generation failed — try again.' }, { status: 500 })
  }

  await supabase
    .from('workout_plans')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('id', plan.id)

  return NextResponse.json({ plan, items })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/workouts-generate.test.ts`
Expected: 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/api/workouts/generate/route.ts __tests__/api/workouts-generate.test.ts
git commit -m "feat: add workout plan generation API route with tests"
```

---

## Task 3: WorkoutCard Component + Tests

**Files:**
- Create: `components/workouts/workout-card.tsx`
- Create: `__tests__/workouts/workout-card.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/workouts/workout-card.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import WorkoutCard from '@/components/workouts/workout-card'
import type { WorkoutPlanItem } from '@/lib/types'

const mockItem: WorkoutPlanItem = {
  id: 'item-1',
  workout_plan_id: 'plan-1',
  day_of_week: 'mon',
  name: 'Push Day',
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 10, weight_kg: 60 },
    { name: 'Push-Up', sets: 3, reps: 12, weight_kg: 0 },
  ],
}

describe('WorkoutCard', () => {
  it('renders day, workout name, and exercise list', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    expect(screen.getByText('Push Day')).toBeInTheDocument()
    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.getByText(/push-up/i)).toBeInTheDocument()
  })

  it('clicking Log workout switches to log mode', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('log mode inputs are pre-filled with target values', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    expect(screen.getByLabelText('Bench Press Sets')).toHaveValue(3)
    expect(screen.getByLabelText('Bench Press kg')).toHaveValue(60)
  })

  it('cancel returns to view mode', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument()
  })

  it('save calls onSave with correct payload', () => {
    const mockSave = jest.fn()
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={mockSave} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      workout_plan_item_id: 'item-1',
      completed: true,
      exercises_logged: expect.arrayContaining([
        expect.objectContaining({ name: 'Bench Press', actual_sets: 3, actual_reps: 10, actual_weight_kg: 60 }),
      ]),
    }))
  })

  it('shows completed badge when isLogged is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={true} onSave={jest.fn()} isSaving={false} />)
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
  })

  it('Log workout button is absent when isLogged is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={true} onSave={jest.fn()} isSaving={false} />)
    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument()
  })

  it('save button shows Saving and is disabled when isSaving is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={true} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    const saveBtn = screen.getByRole('button', { name: /saving/i })
    expect(saveBtn).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/workouts/workout-card.test.tsx`
Expected: FAIL — "Cannot find module '@/components/workouts/workout-card'"

- [ ] **Step 3: Create `components/workouts/workout-card.tsx`**

```typescript
'use client'
import { useState } from 'react'
import type { WorkoutPlanItem, ExerciseLog, WorkoutLogPayload } from '@/lib/types'

interface Props {
  item: WorkoutPlanItem
  isLogged: boolean
  onSave: (payload: WorkoutLogPayload) => void
  isSaving: boolean
}

export default function WorkoutCard({ item, isLogged, onSave, isSaving }: Props) {
  const [mode, setMode] = useState<'view' | 'log'>('view')
  const [actuals, setActuals] = useState<ExerciseLog[]>(
    item.exercises.map(e => ({
      name: e.name,
      actual_sets: e.sets,
      actual_reps: e.reps,
      actual_weight_kg: e.weight_kg,
    }))
  )
  const [notes, setNotes] = useState('')

  const dayLabel = item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1)

  const handleSave = () => {
    onSave({
      workout_plan_item_id: item.id,
      date: new Date().toISOString().split('T')[0],
      completed: true,
      exercises_logged: actuals,
      notes,
    })
  }

  const updateActual = (idx: number, field: keyof ExerciseLog, value: number) => {
    setActuals(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  if (isLogged) {
    return (
      <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
            <p className="font-bold text-sm">{item.name}</p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
            ✓ Completed
          </span>
        </div>
        <ul className="space-y-1">
          {item.exercises.map((e, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{e.name}</span>
              {' · '}{e.sets}×{e.reps} · {e.weight_kg}kg
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
        <p className="font-bold text-sm">{item.name}</p>
      </div>

      {mode === 'view' ? (
        <>
          <ul className="space-y-1">
            {item.exercises.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{e.name}</span>
                {' · '}{e.sets}×{e.reps} · {e.weight_kg}kg
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setMode('log')}
            className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:bg-primary/90 transition-colors"
          >
            Log workout
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {actuals.map((e, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-xs font-semibold">{e.name}</p>
                <div className="flex gap-2">
                  {(
                    [
                      { label: 'Sets', field: 'actual_sets' as keyof ExerciseLog },
                      { label: 'Reps', field: 'actual_reps' as keyof ExerciseLog },
                      { label: 'kg', field: 'actual_weight_kg' as keyof ExerciseLog },
                    ] as const
                  ).map(({ label, field }) => (
                    <div key={field} className="flex-1 space-y-0.5">
                      <label
                        htmlFor={`${item.id}-${idx}-${field}`}
                        className="text-[10px] text-muted-foreground block"
                      >
                        {label}
                      </label>
                      <input
                        id={`${item.id}-${idx}-${field}`}
                        type="number"
                        min={0}
                        step={field === 'actual_weight_kg' ? 0.5 : 1}
                        value={e[field] as number}
                        onChange={ev => updateActual(idx, field, Number(ev.target.value))}
                        aria-label={`${e.name} ${label}`}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              aria-label="Workout notes"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('view')}
              className="flex-1 rounded-lg border text-sm font-semibold py-2 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/workouts/workout-card.test.tsx`
Expected: 8 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/workouts/workout-card.tsx __tests__/workouts/workout-card.test.tsx
git commit -m "feat: add WorkoutCard component with log mode and tests"
```

---

## Task 4: /workouts Server + Client Pages

**Files:**
- Modify: `app/(app)/workouts/page.tsx`
- Create: `app/(app)/workouts/client.tsx`

- [ ] **Step 1: Replace `app/(app)/workouts/page.tsx` with server component**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutsClient from './client'

export default async function WorkoutsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: activePlan } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const items = activePlan
    ? await supabase
        .from('workout_plan_items')
        .select('*')
        .eq('workout_plan_id', activePlan.id)
        .then(({ data }) => data ?? [])
    : []

  const today = new Date().toISOString().split('T')[0]
  const { data: todayLogs } = await supabase
    .from('workout_logs')
    .select('workout_plan_item_id')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('completed', true)

  const loggedItemIds = (todayLogs ?? [])
    .map(l => l.workout_plan_item_id)
    .filter(Boolean) as string[]

  return (
    <WorkoutsClient
      key={activePlan?.id ?? 'no-plan'}
      activePlan={activePlan}
      items={items}
      loggedItemIds={loggedItemIds}
      userId={user.id}
    />
  )
}
```

- [ ] **Step 2: Create `app/(app)/workouts/client.tsx`**

```typescript
'use client'
import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkoutCard from '@/components/workouts/workout-card'
import { Button } from '@/components/ui/button'
import type { WorkoutPlan, WorkoutPlanItem, DayOfWeek, WorkoutLogPayload } from '@/lib/types'

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

interface Props {
  activePlan: WorkoutPlan | null
  items: WorkoutPlanItem[]
  loggedItemIds: string[]
  userId: string
}

export default function WorkoutsClient({ activePlan, items, loggedItemIds, userId }: Props) {
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set(loggedItemIds))
  const [isGenerating, setIsGenerating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isGeneratingRef = useRef(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const itemByDay = Object.fromEntries(items.map(i => [i.day_of_week, i]))

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return
    isGeneratingRef.current = true
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/workouts/generate', { method: 'POST' })
      if (!res.ok) {
        setError('Plan generation failed — try again.')
        return
      }
      router.refresh()
    } finally {
      setIsGenerating(false)
      isGeneratingRef.current = false
    }
  }

  const handleSave = async (payload: WorkoutLogPayload) => {
    setSavingId(payload.workout_plan_item_id)
    setError(null)
    const { error: dbError } = await supabase.from('workout_logs').insert({
      user_id: userId,
      ...payload,
    })
    if (dbError) {
      setError('Could not save log — please try again.')
    } else {
      setLoggedIds(prev => new Set([...prev, payload.workout_plan_item_id]))
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
          {isGenerating ? 'Generating…' : activePlan ? 'Regenerate plan' : 'Generate workout plan'}
        </Button>
      </div>

      <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
        {error ?? ''}
      </p>

      {!activePlan ? (
        <p className="text-muted-foreground text-sm">
          No workout plan yet. Click &quot;Generate workout plan&quot; to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {DAYS.map(({ key, label }) => {
            const item = itemByDay[key]
            if (!item) {
              return (
                <div key={key} className="rounded-xl border border-dashed p-4 flex items-center justify-center min-h-[120px]">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">Rest</p>
                  </div>
                </div>
              )
            }
            return (
              <WorkoutCard
                key={item.id}
                item={item}
                isLogged={loggedIds.has(item.id)}
                onSave={handleSave}
                isSaving={savingId === item.id}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite to verify nothing is broken**

Run: `npx jest --passWithNoTests`
Expected: all existing tests pass (76+)

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/workouts/page.tsx" "app/(app)/workouts/client.tsx"
git commit -m "feat: add workouts page with weekly grid and log workout UI"
```

---

## Task 5: ProfileForm Component + Tests

**Files:**
- Create: `components/settings/profile-form.tsx`
- Create: `__tests__/settings/profile-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/settings/profile-form.test.tsx`:

```typescript
jest.mock('@/lib/supabase/client')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileForm from '@/components/settings/profile-form'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const baseProfile: Profile = {
  id: 'profile-1',
  user_id: 'uid-1',
  sex: 'male',
  age: 28,
  weight_kg: 75,
  height_cm: 175,
  goal: 'lose',
  target_weight_kg: 65,
  activity_level: 'moderately_active',
  experience_level: 'beginner',
  workout_days_per_week: 3,
  cuisine_preference: 'Indian',
  dietary_restrictions: [],
  created_at: '',
  updated_at: '',
}

function makeMockSupabase(updateError: { message: string } | null = null) {
  return {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      }),
    }),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateClient.mockReturnValue(makeMockSupabase() as never)
})

describe('ProfileForm', () => {
  it('renders profile fields pre-filled from profile prop', () => {
    render(<ProfileForm profile={baseProfile} />)
    expect(screen.getByDisplayValue('28')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Indian')).toBeInTheDocument()
  })

  it('shows recalculate prompt when goal changes and form is saved successfully', async () => {
    render(<ProfileForm profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /gain muscle/i }))
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/calorie targets may have changed/i)).toBeInTheDocument()
  })

  it('does not show recalculate prompt when only unrelated field changes', async () => {
    render(<ProfileForm profile={baseProfile} />)
    const cuisineInput = screen.getByLabelText(/cuisine/i)
    await userEvent.clear(cuisineInput)
    await userEvent.type(cuisineInput, 'Mediterranean')
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(screen.queryByText(/calorie targets may have changed/i)).not.toBeInTheDocument()
    })
    expect(screen.getByText(/profile saved/i)).toBeInTheDocument()
  })

  it('shows error message when save fails', async () => {
    mockCreateClient.mockReturnValue(makeMockSupabase({ message: 'db error' }) as never)
    render(<ProfileForm profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/could not save profile/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/settings/profile-form.test.tsx`
Expected: FAIL — "Cannot find module '@/components/settings/profile-form'"

- [ ] **Step 3: Create `components/settings/profile-form.tsx`**

```typescript
'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Sex, Goal, ActivityLevel, ExperienceLevel } from '@/lib/types'

const GOALS: { value: Goal; label: string; description: string; icon: string }[] = [
  { value: 'lose', label: 'Lose weight', description: 'Calorie deficit', icon: '🔥' },
  { value: 'maintain', label: 'Maintain', description: 'Balanced calories', icon: '⚖️' },
  { value: 'gain', label: 'Gain muscle', description: 'Calorie surplus', icon: '💪' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
  { value: 'sedentary', label: 'Sedentary', detail: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', detail: '1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately active', detail: '3–5 days/week' },
  { value: 'very_active', label: 'Very active', detail: '6–7 days/week' },
]

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; detail: string }[] = [
  { value: 'beginner', label: 'Beginner', detail: '< 1 year' },
  { value: 'intermediate', label: 'Intermediate', detail: '1–3 years' },
  { value: 'advanced', label: 'Advanced', detail: '3+ years' },
]

interface Props {
  profile: Profile
}

export default function ProfileForm({ profile: initialProfile }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [sex, setSex] = useState<Sex>(initialProfile.sex)
  const [age, setAge] = useState<number | ''>(initialProfile.age)
  const [weightKg, setWeightKg] = useState<number | ''>(initialProfile.weight_kg)
  const [heightCm, setHeightCm] = useState<number | ''>(initialProfile.height_cm)
  const [goal, setGoal] = useState<Goal>(initialProfile.goal)
  const [targetWeight, setTargetWeight] = useState<number | ''>(initialProfile.target_weight_kg ?? '')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activity_level)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(initialProfile.experience_level)
  const [workoutDays, setWorkoutDays] = useState<number | ''>(initialProfile.workout_days_per_week)
  const [cuisine, setCuisine] = useState(initialProfile.cuisine_preference)
  const [restrictions, setRestrictions] = useState(initialProfile.dietary_restrictions.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showRecalculate, setShowRecalculate] = useState(false)
  const [newTargets, setNewTargets] = useState<{ daily_calories: number; bmi: number; bmi_category: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    setShowRecalculate(false)
    setNewTargets(null)

    const goalChanged = goal !== initialProfile.goal
    const weightChanged = Number(weightKg) !== Number(initialProfile.weight_kg)

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        sex,
        age: Number(age),
        weight_kg: Number(weightKg),
        height_cm: Number(heightCm),
        goal,
        target_weight_kg: targetWeight === '' ? null : Number(targetWeight),
        activity_level: activityLevel,
        experience_level: experienceLevel,
        workout_days_per_week: Number(workoutDays),
        cuisine_preference: cuisine,
        dietary_restrictions: restrictions.split(',').map(s => s.trim()).filter(Boolean),
      })
      .eq('user_id', initialProfile.user_id)

    if (dbError) {
      setError('Could not save profile — please try again.')
      setSaving(false)
      return
    }

    setSuccess(true)
    if (goalChanged || weightChanged) setShowRecalculate(true)
    setSaving(false)
  }

  const handleRecalculate = async () => {
    setShowRecalculate(false)
    const res = await fetch('/api/calorie/calculate', { method: 'POST' })
    if (res.ok) setNewTargets(await res.json())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Biological sex</Label>
        <div className="flex gap-2 pt-1">
          {(['male', 'female'] as Sex[]).map(s => (
            <button key={s} type="button" onClick={() => setSex(s)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold capitalize transition-colors ${
                sex === s ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-muted'
              }`}>
              {s === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'age', label: 'Age', value: age, onChange: (v: number | '') => setAge(v), placeholder: '30' },
          { id: 'weight', label: 'Weight (kg)', value: weightKg, onChange: (v: number | '') => setWeightKg(v), placeholder: '70' },
          { id: 'height', label: 'Height (cm)', value: heightCm, onChange: (v: number | '') => setHeightCm(v), placeholder: '170' },
        ].map(({ id, label, value, onChange, placeholder }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="number" step="0.1" placeholder={placeholder} className="h-11"
              value={value}
              onChange={e => onChange(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Goal</Label>
        <div className="space-y-2 pt-1">
          {GOALS.map(({ value, label, description, icon }) => (
            <button key={value} type="button" onClick={() => setGoal(value)}
              className={`w-full flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                goal === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
              <span className="text-xl shrink-0">{icon}</span>
              <div>
                <p className={`text-sm font-semibold ${goal === value ? 'text-primary' : ''}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${goal === value ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target-weight">Target weight (kg)</Label>
        <Input id="target-weight" type="number" step="0.1" placeholder="e.g. 65" className="h-11"
          value={targetWeight}
          onChange={e => setTargetWeight(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {ACTIVITY_OPTIONS.map(({ value, label, detail }) => (
            <button key={value} type="button" onClick={() => setActivityLevel(value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                activityLevel === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
              <p className={`text-xs font-semibold ${activityLevel === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Fitness experience</Label>
        <div className="flex gap-2 pt-1">
          {EXPERIENCE_OPTIONS.map(({ value, label, detail }) => (
            <button key={value} type="button" onClick={() => setExperienceLevel(value)}
              className={`flex-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                experienceLevel === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
              <p className={`text-xs font-semibold ${experienceLevel === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout-days">Workout days per week</Label>
        <Input id="workout-days" type="number" min={1} max={7} placeholder="e.g. 4" className="h-11"
          value={workoutDays}
          onChange={e => setWorkoutDays(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cuisine">Cuisine preference</Label>
        <Input id="cuisine" type="text" placeholder="e.g. Indian, Mediterranean" className="h-11"
          value={cuisine} onChange={e => setCuisine(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="restrictions">Dietary restrictions <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="restrictions" type="text" placeholder="e.g. no fish, vegetarian" className="h-11"
          value={restrictions} onChange={e => setRestrictions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Leave blank if none.</p>
      </div>

      {success && !showRecalculate && !newTargets && (
        <p className="text-sm text-green-600">Profile saved.</p>
      )}

      {showRecalculate && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <p className="text-sm font-medium">Your calorie targets may have changed. Recalculate?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleRecalculate}>Yes, recalculate</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowRecalculate(false)}>Skip</Button>
          </div>
        </div>
      )}

      {newTargets && (
        <p className="text-sm text-muted-foreground">
          New target: <strong>{newTargets.daily_calories} kcal/day</strong> · BMI {newTargets.bmi} ({newTargets.bmi_category})
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving} className="w-full h-11">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/settings/profile-form.test.tsx`
Expected: 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/settings/profile-form.tsx __tests__/settings/profile-form.test.tsx
git commit -m "feat: add ProfileForm component with recalculate prompt and tests"
```

---

## Task 6: SecurityForm Component + Tests

**Files:**
- Create: `components/settings/security-form.tsx`
- Create: `__tests__/settings/security-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/settings/security-form.test.tsx`:

```typescript
jest.mock('@/lib/supabase/client')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SecurityForm from '@/components/settings/security-form'
import { createClient } from '@/lib/supabase/client'

const mockUpdateUser = jest.fn()
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateUser.mockResolvedValue({ error: null })
  mockCreateClient.mockReturnValue({
    auth: { updateUser: mockUpdateUser },
  } as never)
})

describe('SecurityForm', () => {
  it('shows current email as read-only context', () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new password/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with email on valid email submit', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
    })
  })

  it('shows success message after email update', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText(/email updated/i)).toBeInTheDocument()
  })

  it('calls updateUser with password on valid password submit', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' })
    })
  })

  it('shows error message when email update fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Email already in use' } })
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'taken@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/settings/security-form.test.tsx`
Expected: FAIL — "Cannot find module '@/components/settings/security-form'"

- [ ] **Step 3: Create `components/settings/security-form.tsx`**

```typescript
'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentEmail: string
}

export default function SecurityForm({ currentEmail }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError(null)
    setEmailSuccess(false)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSuccess(true)
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Email section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Email address</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Current: {currentEmail}</p>
        </div>
        <form onSubmit={handleEmailUpdate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="new@example.com"
              className="h-11 max-w-sm"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {emailSuccess && <p className="text-sm text-green-600">Email updated — check your inbox to confirm.</p>}
          {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          <Button type="submit" disabled={emailLoading} size="sm">
            {emailLoading ? 'Updating…' : 'Update email'}
          </Button>
        </form>
      </div>

      {/* Password section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Password</h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="8+ characters"
              className="h-11 max-w-sm"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              className="h-11 max-w-sm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {passwordSuccess && <p className="text-sm text-green-600">Password updated successfully.</p>}
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button type="submit" disabled={passwordLoading} size="sm">
            {passwordLoading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/settings/security-form.test.tsx`
Expected: 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/settings/security-form.tsx __tests__/settings/security-form.test.tsx
git commit -m "feat: add SecurityForm component with email and password update tests"
```

---

## Task 7: /settings Server Page

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Replace placeholder with server component**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/settings/profile-form'
import SecurityForm from '@/components/settings/security-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  return (
    <div className="max-w-xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and account</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to personalise your meal and workout plans
          </p>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <div className="border-t" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Security</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Update your login credentials</p>
        </div>
        <SecurityForm currentEmail={user.email ?? ''} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npx jest --passWithNoTests`
Expected: all tests pass (previous 76 + new tests)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/page.tsx"
git commit -m "feat: add settings page with profile and security sections"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ workout_plans, workout_plan_items, workout_logs tables with RLS → Task 1
- ✅ POST /api/workouts/generate → Task 2
- ✅ WorkoutCard with view/log modes, pre-filled inputs, onSave → Task 3
- ✅ /workouts server + client page with generate button and rest day chips → Task 4
- ✅ ProfileForm with all fields, recalculate prompt on goal/weight change → Task 5
- ✅ SecurityForm with email + password update, password match validation → Task 6
- ✅ /settings page composing both forms → Task 7

**No placeholders:** Every step has complete code. ✅

**Type consistency:**
- `WorkoutLogPayload` defined in `lib/types.ts` (Task 1), used in `workout-card.tsx` (Task 3) and `client.tsx` (Task 4). ✅
- `WorkoutPlanItem.exercises: Exercise[]` — `Exercise` defined in Task 1, used in Task 3. ✅
- `ExerciseLog` defined in Task 1, used in `workout-card.tsx` actuals state and WorkoutLogPayload. ✅
