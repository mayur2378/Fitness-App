# Plan 4: Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/progress` page showing calorie trends, workout history, and manual daily weight tracking over a user-selected time range (Today / 2d / 7d / 30d / 90d) using Recharts.

**Architecture:** Server component fetches the last 30 days of data and passes it to `ProgressClient`, which handles time range switching by re-querying Supabase browser client. Three focused chart components (CalorieChart, WorkoutChart, WeightChart) each own their empty-state and rendering. Weight entries are upserted via browser client — one entry per user per day.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Recharts, Supabase JS SDK, Jest + React Testing Library

---

## Worktree Setup

Before starting, create a worktree using the `superpowers:using-git-worktrees` skill. The worktree will be created at:
`C:\Users\mfote\.config\superpowers\worktrees\Fitness App\feat-plan-4-progress`

Branch name: `feat-plan-4-progress`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/0005_weight_entries.sql` | Create | weight_entries table + RLS |
| `lib/types.ts` | Modify | Add WeightEntry, CalorieEntry, WorkoutEntry |
| `jest.config.ts` | Modify | Add `__tests__/progress/` to jsdom testMatch |
| `components/progress/calorie-chart.tsx` | Create | Bar chart: daily calories vs target |
| `components/progress/workout-chart.tsx` | Create | Bar chart: workouts completed per day |
| `components/progress/weight-chart.tsx` | Create | Line chart: weight over time vs target |
| `__tests__/progress/calorie-chart.test.tsx` | Create | CalorieChart rendering tests |
| `__tests__/progress/workout-chart.test.tsx` | Create | WorkoutChart rendering tests |
| `__tests__/progress/weight-chart.test.tsx` | Create | WeightChart rendering tests |
| `__tests__/progress/weight-log.test.tsx` | Create | Weight save/error/disabled tests |
| `app/(app)/progress/client.tsx` | Create | Time range state, re-fetch, weight log UI |
| `app/(app)/progress/page.tsx` | Modify | Replace placeholder with server component |

---

## Task 1: Types + Migration + Recharts + Jest Config

**Files:**
- Create: `supabase/migrations/0005_weight_entries.sql`
- Modify: `lib/types.ts`
- Modify: `jest.config.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/0005_weight_entries.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL Editor → paste and run the migration. Verify the `weight_entries` table appears.

- [ ] **Step 3: Add new types to `lib/types.ts`**

Append to the end of `lib/types.ts`:

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

- [ ] **Step 4: Install Recharts**

```bash
npm install recharts
```

Expected: recharts added to package.json dependencies.

- [ ] **Step 5: Extend jest.config.ts to include progress tests**

In `jest.config.ts`, find the jsdom project's `testMatch` array and add the progress pattern:

```typescript
testMatch: [
  '**/__tests__/onboarding/**/*.test.tsx',
  '**/__tests__/meals/**/*.test.tsx',
  '**/__tests__/workouts/**/*.test.tsx',
  '**/__tests__/settings/**/*.test.tsx',
  '**/__tests__/progress/**/*.test.tsx',
],
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0005_weight_entries.sql lib/types.ts jest.config.ts package.json package-lock.json
git commit -m "feat: add weight_entries migration, progress types, recharts"
```

---

## Task 2: CalorieChart Component + Tests

**Files:**
- Create: `__tests__/progress/calorie-chart.test.tsx`
- Create: `components/progress/calorie-chart.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/progress/calorie-chart.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import CalorieChart from '@/components/progress/calorie-chart'
import type { CalorieEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: CalorieEntry[] = [
  { date: '2026-04-17', calories: 1800 },
  { date: '2026-04-18', calories: 2100 },
]

describe('CalorieChart', () => {
  it('renders empty state when no data', () => {
    render(<CalorieChart data={[]} target={2000} />)
    expect(screen.getByText('No meals logged in this period')).toBeInTheDocument()
  })

  it('renders bar chart when data is provided', () => {
    render(<CalorieChart data={SAMPLE} target={2000} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders without crashing when target is null', () => {
    render(<CalorieChart data={SAMPLE} target={null} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/progress/calorie-chart.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/progress/calorie-chart'`

- [ ] **Step 3: Implement CalorieChart**

Create `components/progress/calorie-chart.tsx`:

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { CalorieEntry } from '@/lib/types'

interface Props {
  data: CalorieEntry[]
  target: number | null
}

export default function CalorieChart({ data, target }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No meals logged in this period
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
          itemStyle={{ color: 'oklch(68% 0.2 40)' }}
          formatter={(v: number) => [`${v} kcal`, 'Calories']}
          labelFormatter={l => `Date: ${l}`}
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke="oklch(68% 0.2 40)"
            strokeDasharray="4 4"
            label={{ value: 'Target', fontSize: 10, fill: 'oklch(68% 0.2 40)', position: 'insideTopRight' }}
          />
        )}
        <Bar dataKey="calories" fill="oklch(68% 0.2 40)" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/progress/calorie-chart.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/progress/calorie-chart.tsx __tests__/progress/calorie-chart.test.tsx
git commit -m "feat: add CalorieChart component with tests"
```

---

## Task 3: WorkoutChart Component + Tests

**Files:**
- Create: `__tests__/progress/workout-chart.test.tsx`
- Create: `components/progress/workout-chart.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/progress/workout-chart.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import WorkoutChart from '@/components/progress/workout-chart'
import type { WorkoutEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: WorkoutEntry[] = [
  { date: '2026-04-17', completed: true },
  { date: '2026-04-18', completed: false },
  { date: '2026-04-17', completed: true },
]

describe('WorkoutChart', () => {
  it('renders empty state when no data', () => {
    render(<WorkoutChart data={[]} />)
    expect(screen.getByText('No workouts logged in this period')).toBeInTheDocument()
  })

  it('renders bar chart when data is provided', () => {
    render(<WorkoutChart data={SAMPLE} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/progress/workout-chart.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/progress/workout-chart'`

- [ ] **Step 3: Implement WorkoutChart**

Create `components/progress/workout-chart.tsx`:

```typescript
'use client'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WorkoutEntry } from '@/lib/types'

interface Props {
  data: WorkoutEntry[]
}

interface DayEntry {
  date: string
  completed: number
  missed: number
}

export default function WorkoutChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No workouts logged in this period
      </p>
    )
  }

  const byDate = new Map<string, DayEntry>()
  for (const entry of data) {
    const existing = byDate.get(entry.date) ?? { date: entry.date, completed: 0, missed: 0 }
    if (entry.completed) existing.completed++
    else existing.missed++
    byDate.set(entry.date, existing)
  }
  const chartData = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
        />
        <Bar dataKey="completed" name="Completed" fill="oklch(68% 0.2 40)" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
        <Bar dataKey="missed" name="Missed" fill="oklch(30% 0.006 240)" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/progress/workout-chart.test.tsx --no-coverage
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/progress/workout-chart.tsx __tests__/progress/workout-chart.test.tsx
git commit -m "feat: add WorkoutChart component with tests"
```

---

## Task 4: WeightChart Component + Tests

**Files:**
- Create: `__tests__/progress/weight-chart.test.tsx`
- Create: `components/progress/weight-chart.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/progress/weight-chart.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import WeightChart from '@/components/progress/weight-chart'
import type { WeightEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: WeightEntry[] = [
  { id: 'w1', user_id: 'u1', date: '2026-04-17', weight_kg: 78, created_at: '' },
  { id: 'w2', user_id: 'u1', date: '2026-04-18', weight_kg: 77.5, created_at: '' },
]

describe('WeightChart', () => {
  it('renders empty state when no data', () => {
    render(<WeightChart data={[]} target={null} />)
    expect(screen.getByText('No weight entries yet — log your weight above')).toBeInTheDocument()
  })

  it('renders line chart when data is provided', () => {
    render(<WeightChart data={SAMPLE} target={75} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders without crashing when target is null', () => {
    render(<WeightChart data={SAMPLE} target={null} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/progress/weight-chart.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/progress/weight-chart'`

- [ ] **Step 3: Implement WeightChart**

Create `components/progress/weight-chart.tsx`:

```typescript
'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WeightEntry } from '@/lib/types'

interface Props {
  data: WeightEntry[]
  target: number | null
}

export default function WeightChart({ data, target }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No weight entries yet — log your weight above
      </p>
    )
  }

  const chartData = data.map(e => ({ date: e.date, weight: Number(e.weight_kg) }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
          itemStyle={{ color: 'oklch(68% 0.2 40)' }}
          formatter={(v: number) => [`${v} kg`, 'Weight']}
          labelFormatter={l => `Date: ${l}`}
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke="oklch(50% 0.006 240)"
            strokeDasharray="4 4"
            label={{ value: 'Target', fontSize: 10, fill: 'oklch(50% 0.006 240)', position: 'insideTopRight' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="oklch(68% 0.2 40)"
          strokeWidth={2}
          dot={{ fill: 'oklch(68% 0.2 40)', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/progress/weight-chart.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/progress/weight-chart.tsx __tests__/progress/weight-chart.test.tsx
git commit -m "feat: add WeightChart component with tests"
```

---

## Task 5: ProgressClient + Weight Log Tests

**Files:**
- Create: `__tests__/progress/weight-log.test.tsx`
- Create: `app/(app)/progress/client.tsx`

- [ ] **Step 1: Write the failing weight-log tests**

Create `__tests__/progress/weight-log.test.tsx`:

```typescript
jest.mock('@/lib/supabase/client')
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null, Cell: () => null, Line: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null,
  ReferenceLine: () => null, CartesianGrid: () => null,
}))

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgressClient from '@/app/(app)/progress/client'
import { createClient } from '@/lib/supabase/client'

const MOCK_WEIGHT_ENTRY = { id: 'w1', user_id: 'uid-1', date: '2026-04-19', weight_kg: 75, created_at: '' }

function makeMockSupabase(upsertResult: { data: typeof MOCK_WEIGHT_ENTRY | null; error: { message: string } | null }) {
  const mockSingle = jest.fn().mockResolvedValue(upsertResult)
  const mockSelect = jest.fn(() => ({ single: mockSingle }))
  const mockUpsert = jest.fn(() => ({ select: mockSelect }))
  const mockChain = {
    upsert: mockUpsert,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: jest.fn(() => mockChain), _mockUpsert: mockUpsert }
}

const DEFAULT_PROPS = {
  calorieData: [],
  workoutData: [],
  weightData: [],
  calorieTarget: 2000,
  targetWeight: 70,
  userId: 'uid-1',
}

beforeEach(() => jest.clearAllMocks())

describe('ProgressClient weight log', () => {
  it('calls upsert with correct payload on save', async () => {
    const mockSupabase = makeMockSupabase({ data: MOCK_WEIGHT_ENTRY, error: null })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(mockSupabase._mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'uid-1', weight_kg: 75 }),
        { onConflict: 'user_id,date' }
      )
    })
  })

  it('disables button while saving', async () => {
    const mockSingle = jest.fn(() => new Promise(() => {})) // never resolves
    const mockSupabase = {
      from: jest.fn(() => ({
        upsert: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) })),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })

  it('shows error message when upsert fails', async () => {
    const mockSupabase = makeMockSupabase({ data: null, error: { message: 'DB error' } })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save weight — please try again.')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/progress/weight-log.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/(app)/progress/client'`

- [ ] **Step 3: Implement ProgressClient**

Create `app/(app)/progress/client.tsx`:

```typescript
'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import CalorieChart from '@/components/progress/calorie-chart'
import WorkoutChart from '@/components/progress/workout-chart'
import WeightChart from '@/components/progress/weight-chart'
import type { CalorieEntry, WorkoutEntry, WeightEntry } from '@/lib/types'

type RangeKey = '1d' | '2d' | '7d' | '30d' | '90d'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1d', label: 'Today' },
  { key: '2d', label: '2d' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
]

function getStartDate(range: RangeKey, today: string): string {
  if (range === '1d') return today
  const daysBack: Record<Exclude<RangeKey, '1d'>, number> = { '2d': 1, '7d': 6, '30d': 29, '90d': 89 }
  const d = new Date(today + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - daysBack[range])
  return d.toISOString().split('T')[0]
}

interface Props {
  calorieData: CalorieEntry[]
  workoutData: WorkoutEntry[]
  weightData: WeightEntry[]
  calorieTarget: number | null
  targetWeight: number | null
  userId: string
}

export default function ProgressClient({
  calorieData: initialCalorieData,
  workoutData: initialWorkoutData,
  weightData: initialWeightData,
  calorieTarget,
  targetWeight,
  userId,
}: Props) {
  const [range, setRange] = useState<RangeKey>('30d')
  const [calorieData, setCalorieData] = useState<CalorieEntry[]>(initialCalorieData)
  const [workoutData, setWorkoutData] = useState<WorkoutEntry[]>(initialWorkoutData)
  const [weightData, setWeightData] = useState<WeightEntry[]>(initialWeightData)
  const [weightInput, setWeightInput] = useState('')
  const [isSavingWeight, setIsSavingWeight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const handleRangeChange = async (newRange: RangeKey) => {
    setRange(newRange)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const startDate = getStartDate(newRange, today)

    const [calResult, workoutResult, weightResult] = await Promise.all([
      supabase.from('meal_logs').select('date, calories').eq('user_id', userId).eq('eaten', true).gte('date', startDate).lte('date', today),
      supabase.from('workout_logs').select('date, completed').eq('user_id', userId).gte('date', startDate).lte('date', today),
      supabase.from('weight_entries').select('id, user_id, date, weight_kg, created_at').eq('user_id', userId).gte('date', startDate).lte('date', today).order('date'),
    ])

    if (calResult.error || workoutResult.error || weightResult.error) {
      setError('Could not load data — please try again.')
      return
    }

    const calMap = new Map<string, number>()
    for (const row of calResult.data ?? []) {
      calMap.set(row.date, (calMap.get(row.date) ?? 0) + Number(row.calories))
    }
    setCalorieData(
      Array.from(calMap.entries())
        .map(([date, calories]) => ({ date, calories }))
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setWorkoutData((workoutResult.data ?? []).map(r => ({ date: r.date, completed: r.completed })))
    setWeightData(weightResult.data ?? [])
  }

  const handleSaveWeight = async () => {
    const val = Number(weightInput)
    if (!weightInput || isNaN(val) || val <= 0) return
    setIsSavingWeight(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const { data, error: dbError } = await supabase
      .from('weight_entries')
      .upsert({ user_id: userId, date: today, weight_kg: val }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (dbError) {
      setError('Could not save weight — please try again.')
    } else {
      setWeightData(prev => {
        const filtered = prev.filter(e => e.date !== today)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
      setWeightInput('')
    }
    setIsSavingWeight(false)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">Progress</h1>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleRangeChange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.1"
          min="0"
          placeholder="e.g. 75.5"
          aria-label="Weight (kg)"
          value={weightInput}
          onChange={e => setWeightInput(e.target.value)}
          className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm font-data focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={handleSaveWeight}
          disabled={isSavingWeight || !weightInput}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSavingWeight ? 'Saving…' : 'Log weight'}
        </button>
        <span className="text-xs text-muted-foreground">kg — today&apos;s entry</span>
      </div>

      <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
        {error ?? ''}
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Calories</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <CalorieChart data={calorieData} target={calorieTarget} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Workouts</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <WorkoutChart data={workoutData} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Weight</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <WeightChart data={weightData} target={targetWeight} />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/progress/weight-log.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Run full test suite**

```bash
npx jest --passWithNoTests
```

Expected: all tests passing (previous 101 + 8 new = 109 total)

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/progress/client.tsx __tests__/progress/weight-log.test.tsx
git commit -m "feat: add ProgressClient with time range switching and weight logging"
```

---

## Task 6: /progress Server Page

**Files:**
- Modify: `app/(app)/progress/page.tsx`

- [ ] **Step 1: Replace the placeholder with the server component**

Overwrite `app/(app)/progress/page.tsx` with:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateCalorieTargets } from '@/lib/calorie-utils'
import ProgressClient from './client'
import type { CalorieEntry, WorkoutEntry, WeightEntry } from '@/lib/types'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('sex, age, weight_kg, height_cm, goal, activity_level, target_weight_kg')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const targets = calculateCalorieTargets(profile)
  const calorieTarget = targets.daily_calories
  const targetWeight = profile.target_weight_kg ?? null

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ data: mealRows }, { data: workoutRows }, { data: weightRows }] = await Promise.all([
    supabase.from('meal_logs').select('date, calories').eq('user_id', user.id).eq('eaten', true).gte('date', startDate).lte('date', today),
    supabase.from('workout_logs').select('date, completed').eq('user_id', user.id).gte('date', startDate).lte('date', today),
    supabase.from('weight_entries').select('id, user_id, date, weight_kg, created_at').eq('user_id', user.id).gte('date', startDate).lte('date', today).order('date'),
  ])

  // Aggregate meal_logs by date
  const calMap = new Map<string, number>()
  for (const row of mealRows ?? []) {
    calMap.set(row.date, (calMap.get(row.date) ?? 0) + Number(row.calories))
  }
  const calorieData: CalorieEntry[] = Array.from(calMap.entries())
    .map(([date, calories]) => ({ date, calories }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const workoutData: WorkoutEntry[] = (workoutRows ?? []).map(r => ({ date: r.date, completed: r.completed }))
  const weightData: WeightEntry[] = weightRows ?? []

  return (
    <ProgressClient
      calorieData={calorieData}
      workoutData={workoutData}
      weightData={weightData}
      calorieTarget={calorieTarget}
      targetWeight={targetWeight}
      userId={user.id}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --passWithNoTests
```

Expected: all tests passing.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/progress/page.tsx
git commit -m "feat: add /progress server page with 30-day data prefetch"
```

---

## Done

Run `npm run dev` and navigate to `/progress`. Verify:
- Charts render with real data (or empty states if none logged yet)
- Range selector switches load new data
- Weight input saves and updates the chart immediately
- All three charts respect the selected time range
