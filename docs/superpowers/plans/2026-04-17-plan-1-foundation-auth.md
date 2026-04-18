# Fitness App — Plan 1: Foundation + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 15 PWA, configure Supabase auth and database, build login/signup pages, and implement a 4-step onboarding wizard that saves the user's fitness profile.

**Architecture:** Next.js 15 App Router with TypeScript, Tailwind CSS, and shadcn/ui. Supabase handles email/password auth and stores profiles in PostgreSQL with Row Level Security. Auth middleware protects app routes; the authenticated layout redirects to `/onboarding` if no profile exists yet.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, @supabase/supabase-js, @supabase/ssr, Jest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event

---

## File Structure

```
Fitness App/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, global CSS)
│   ├── page.tsx                      # Redirects to /dashboard
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login form (client component)
│   │   └── signup/page.tsx           # Signup form (client component)
│   ├── (app)/
│   │   ├── layout.tsx                # Authenticated layout: nav + profile gate
│   │   ├── dashboard/page.tsx        # Placeholder — "Dashboard coming soon"
│   │   ├── meals/page.tsx            # Placeholder
│   │   ├── workouts/page.tsx         # Placeholder
│   │   ├── progress/page.tsx         # Placeholder
│   │   └── settings/page.tsx         # Placeholder
│   └── onboarding/
│       └── page.tsx                  # 4-step wizard (client component)
├── components/
│   └── onboarding/
│       ├── step-basic-stats.tsx      # Step 1: age, weight, height
│       ├── step-goal.tsx             # Step 2: goal, target weight
│       ├── step-activity.tsx         # Step 3: activity level, experience, workout days
│       └── step-cuisine.tsx          # Step 4: cuisine preference, dietary restrictions
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client (reads cookies)
│   ├── types.ts                      # Shared TypeScript interfaces
│   └── validation.ts                 # Pure validation functions (no side effects)
├── middleware.ts                     # Protects /dashboard etc, redirects auth users away from /login
├── supabase/
│   └── migrations/
│       └── 0001_profiles.sql         # profiles table + RLS policies
├── jest.config.ts
├── jest.setup.ts
└── __tests__/
    ├── lib/
    │   └── validation.test.ts
    └── onboarding/
        ├── step-basic-stats.test.tsx
        └── step-goal.test.tsx
```

---

## Task 1: Scaffold Next.js 15 Project

**Files:**
- Create: all root config files (`package.json`, `tsconfig.json`, `tailwind.config.ts`, etc.)
- Create: `jest.config.ts`, `jest.setup.ts`
- Create: `.env.local`

- [ ] **Step 1: Scaffold the project**

Run from `C:/Mayur/Projects/Claude/Projects/Fitness App`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted "OK to proceed?" → type `y`. All other options are set by flags.

Expected output ends with: `Success! Created fitness-app at ...`

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-node
```

- [ ] **Step 3: Add shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add button input label card select
```

- [ ] **Step 4: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 5: Create jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to package.json**

Open `package.json` and add to the `scripts` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 7: Create .env.local**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from your Supabase project dashboard → Settings → API.

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Server starts at `http://localhost:3000`. Open browser, see default Next.js page. Stop with Ctrl+C.

- [ ] **Step 9: Run test suite to confirm baseline**

```bash
npm test
```
Expected: `No tests found` or 0 tests — no failures.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Supabase and shadcn/ui"
```

---

## Task 2: TypeScript Types + Validation Functions

**Files:**
- Create: `lib/types.ts`
- Create: `lib/validation.ts`
- Create: `__tests__/lib/validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/validation.test.ts
import {
  validateAge,
  validateWeight,
  validateHeight,
  validateTargetWeight,
  validateWorkoutDays,
  validateCuisine,
} from '@/lib/validation'

describe('validateAge', () => {
  it('returns null for valid age', () => expect(validateAge(25)).toBeNull())
  it('returns error string for age below 13', () => expect(validateAge(12)).toBeTruthy())
  it('returns error string for age above 120', () => expect(validateAge(121)).toBeTruthy())
  it('returns error string for zero', () => expect(validateAge(0)).toBeTruthy())
})

describe('validateWeight', () => {
  it('returns null for valid weight', () => expect(validateWeight(70)).toBeNull())
  it('returns error for weight below 20kg', () => expect(validateWeight(19)).toBeTruthy())
  it('returns error for weight above 500kg', () => expect(validateWeight(501)).toBeTruthy())
})

describe('validateHeight', () => {
  it('returns null for valid height', () => expect(validateHeight(170)).toBeNull())
  it('returns error for height below 50cm', () => expect(validateHeight(49)).toBeTruthy())
  it('returns error for height above 300cm', () => expect(validateHeight(301)).toBeTruthy())
})

describe('validateTargetWeight', () => {
  it('returns null for valid target weight', () => expect(validateTargetWeight(65)).toBeNull())
  it('returns error for target below 20kg', () => expect(validateTargetWeight(19)).toBeTruthy())
  it('returns error for target above 500kg', () => expect(validateTargetWeight(501)).toBeTruthy())
})

describe('validateWorkoutDays', () => {
  it('returns null for 3 days', () => expect(validateWorkoutDays(3)).toBeNull())
  it('returns null for 1 day', () => expect(validateWorkoutDays(1)).toBeNull())
  it('returns null for 7 days', () => expect(validateWorkoutDays(7)).toBeNull())
  it('returns error for 0 days', () => expect(validateWorkoutDays(0)).toBeTruthy())
  it('returns error for 8 days', () => expect(validateWorkoutDays(8)).toBeTruthy())
})

describe('validateCuisine', () => {
  it('returns null for non-empty string', () => expect(validateCuisine('Indian')).toBeNull())
  it('returns error for empty string', () => expect(validateCuisine('')).toBeTruthy())
  it('returns error for whitespace-only string', () => expect(validateCuisine('   ')).toBeTruthy())
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --testPathPattern="validation"
```
Expected: FAIL — `Cannot find module '@/lib/validation'`

- [ ] **Step 3: Create lib/types.ts**

```typescript
// lib/types.ts
export type Goal = 'lose' | 'gain' | 'maintain'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Profile {
  id: string
  user_id: string
  age: number
  weight_kg: number
  height_cm: number
  goal: Goal
  target_weight_kg: number
  activity_level: ActivityLevel
  experience_level: ExperienceLevel
  workout_days_per_week: number
  cuisine_preference: string
  dietary_restrictions: string[]
  created_at: string
  updated_at: string
}

export interface OnboardingData {
  age: number
  weight_kg: number
  height_cm: number
  goal: Goal
  target_weight_kg: number
  activity_level: ActivityLevel
  experience_level: ExperienceLevel
  workout_days_per_week: number
  cuisine_preference: string
  dietary_restrictions: string[]
}
```

- [ ] **Step 4: Create lib/validation.ts**

```typescript
// lib/validation.ts
export function validateAge(age: number): string | null {
  if (!age || age < 13 || age > 120) return 'Age must be between 13 and 120'
  return null
}

export function validateWeight(weight: number): string | null {
  if (!weight || weight < 20 || weight > 500) return 'Weight must be between 20 and 500 kg'
  return null
}

export function validateHeight(height: number): string | null {
  if (!height || height < 50 || height > 300) return 'Height must be between 50 and 300 cm'
  return null
}

export function validateTargetWeight(target: number): string | null {
  if (!target || target < 20 || target > 500) return 'Target weight must be between 20 and 500 kg'
  return null
}

export function validateWorkoutDays(days: number): string | null {
  if (!days || days < 1 || days > 7) return 'Workout days must be between 1 and 7'
  return null
}

export function validateCuisine(cuisine: string): string | null {
  if (!cuisine || !cuisine.trim()) return 'Cuisine preference is required'
  return null
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- --testPathPattern="validation"
```
Expected: PASS — 16 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/validation.ts __tests__/lib/validation.test.ts
git commit -m "feat: add TypeScript types and validated profile field functions"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create lib/supabase/client.ts**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create lib/supabase/server.ts**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 4: Database Migration — Profiles Table

**Files:**
- Create: `supabase/migrations/0001_profiles.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0001_profiles.sql

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  age integer not null check (age between 13 and 120),
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 500),
  height_cm numeric(5,2) not null check (height_cm between 50 and 300),
  goal text not null check (goal in ('lose', 'gain', 'maintain')),
  target_weight_kg numeric(5,2) not null check (target_weight_kg between 20 and 500),
  activity_level text not null check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  workout_days_per_week integer not null check (workout_days_per_week between 1 and 7),
  cuisine_preference text not null,
  dietary_restrictions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration via Supabase dashboard**

1. Open Supabase dashboard → your project → SQL Editor
2. Paste the full SQL above
3. Click Run
4. Expected: `Success. No rows returned`

- [ ] **Step 3: Verify the table was created**

In Supabase dashboard → Table Editor, confirm `profiles` table exists with all columns visible.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_profiles.sql
git commit -m "feat: add profiles table with RLS policies"
```

---

## Task 5: Auth Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/meals') ||
    pathname.startsWith('/workouts') ||
    pathname.startsWith('/progress') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding')

  // Unauthenticated user hitting a protected page → send to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting an auth page → send to dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Manual test**

```bash
npm run dev
```
Open `http://localhost:3000/dashboard` in browser while logged out.
Expected: Redirected to `http://localhost:3000/login`.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware to protect app routes"
```

---

## Task 6: Login + Signup Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create app/(auth)/login/page.tsx**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            No account?{' '}
            <Link href="/signup" className="underline text-foreground">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(auth)/signup/page.tsx**

```tsx
// app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline text-foreground">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Manual test — signup flow**

```bash
npm run dev
```
1. Navigate to `http://localhost:3000/signup`
2. Sign up with a test email + password
3. Expected: Redirected to `/onboarding` (page will be blank/404 until Task 8)
4. Check Supabase dashboard → Authentication → Users → confirm new user created

- [ ] **Step 4: Manual test — login flow**

1. Navigate to `http://localhost:3000/login`
2. Sign in with the test user
3. Expected: Redirected to `/dashboard` (placeholder until Task 9)

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/login/page.tsx app/\(auth\)/signup/page.tsx
git commit -m "feat: add login and signup pages"
```

---

## Task 7: Onboarding Step Components

**Files:**
- Create: `components/onboarding/step-basic-stats.tsx`
- Create: `components/onboarding/step-goal.tsx`
- Create: `components/onboarding/step-activity.tsx`
- Create: `components/onboarding/step-cuisine.tsx`
- Create: `__tests__/onboarding/step-basic-stats.test.tsx`
- Create: `__tests__/onboarding/step-goal.test.tsx`

Each step component receives `defaultValues: Partial<OnboardingData>` and an `onNext` (or `onSubmit` for step 4) callback.

- [ ] **Step 1: Write failing tests for StepBasicStats**

```tsx
// __tests__/onboarding/step-basic-stats.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepBasicStats from '@/components/onboarding/step-basic-stats'

const mockOnNext = jest.fn()

beforeEach(() => mockOnNext.mockClear())

describe('StepBasicStats', () => {
  it('renders age, weight, and height inputs', () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid age', async () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/age/i), '5')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/age must be between/i)).toBeInTheDocument()
    expect(mockOnNext).not.toHaveBeenCalled()
  })

  it('calls onNext with valid values', async () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/age/i), '28')
    await userEvent.type(screen.getByLabelText(/weight/i), '75')
    await userEvent.type(screen.getByLabelText(/height/i), '175')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(mockOnNext).toHaveBeenCalledWith({ age: 28, weight_kg: 75, height_cm: 175 })
  })

  it('pre-fills fields from defaultValues', () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{ age: 30, weight_kg: 80, height_cm: 180 }} />)
    expect(screen.getByLabelText(/age/i)).toHaveValue(30)
    expect(screen.getByLabelText(/weight/i)).toHaveValue(80)
    expect(screen.getByLabelText(/height/i)).toHaveValue(180)
  })
})
```

- [ ] **Step 2: Run test — verify fail**

```bash
npm test -- --testPathPattern="step-basic-stats"
```
Expected: FAIL — `Cannot find module '@/components/onboarding/step-basic-stats'`

- [ ] **Step 3: Create components/onboarding/step-basic-stats.tsx**

```tsx
// components/onboarding/step-basic-stats.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateAge, validateWeight, validateHeight } from '@/lib/validation'
import type { OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'age' | 'weight_kg' | 'height_cm'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepBasicStats({ onNext, defaultValues }: Props) {
  const [age, setAge] = useState<number | ''>(defaultValues.age ?? '')
  const [weightKg, setWeightKg] = useState<number | ''>(defaultValues.weight_kg ?? '')
  const [heightCm, setHeightCm] = useState<number | ''>(defaultValues.height_cm ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const ageErr = validateAge(Number(age))
    const weightErr = validateWeight(Number(weightKg))
    const heightErr = validateHeight(Number(heightCm))
    if (ageErr) newErrors.age = ageErr
    if (weightErr) newErrors.weight_kg = weightErr
    if (heightErr) newErrors.height_cm = heightErr
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({ age: Number(age), weight_kg: Number(weightKg), height_cm: Number(heightCm) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Your stats</h2>
      <div className="space-y-1">
        <Label htmlFor="age">Age (years)</Label>
        <Input
          id="age"
          type="number"
          value={age}
          onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="weight">Weight (kg)</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          value={weightKg}
          onChange={e => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {errors.weight_kg && <p className="text-sm text-destructive">{errors.weight_kg}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="height">Height (cm)</Label>
        <Input
          id="height"
          type="number"
          step="0.1"
          value={heightCm}
          onChange={e => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {errors.height_cm && <p className="text-sm text-destructive">{errors.height_cm}</p>}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
```

- [ ] **Step 4: Run test — verify pass**

```bash
npm test -- --testPathPattern="step-basic-stats"
```
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Write failing tests for StepGoal**

```tsx
// __tests__/onboarding/step-goal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepGoal from '@/components/onboarding/step-goal'

const mockOnNext = jest.fn()
beforeEach(() => mockOnNext.mockClear())

describe('StepGoal', () => {
  it('renders goal selector and target weight input', () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/target weight/i)).toBeInTheDocument()
  })

  it('shows validation error for missing target weight', async () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/target weight/i)).toBeInTheDocument()
    expect(mockOnNext).not.toHaveBeenCalled()
  })

  it('calls onNext with valid values', async () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/target weight/i), '70')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(mockOnNext).toHaveBeenCalledWith(
      expect.objectContaining({ target_weight_kg: 70 })
    )
  })
})
```

- [ ] **Step 6: Run test — verify fail**

```bash
npm test -- --testPathPattern="step-goal"
```
Expected: FAIL — `Cannot find module '@/components/onboarding/step-goal'`

- [ ] **Step 7: Create components/onboarding/step-goal.tsx**

```tsx
// components/onboarding/step-goal.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateTargetWeight } from '@/lib/validation'
import type { Goal, OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'goal' | 'target_weight_kg'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepGoal({ onNext, defaultValues }: Props) {
  const [goal, setGoal] = useState<Goal>(defaultValues.goal ?? 'lose')
  const [targetWeight, setTargetWeight] = useState<number | ''>(defaultValues.target_weight_kg ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateTargetWeight(Number(targetWeight))
    if (err) newErrors.target_weight_kg = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({ goal, target_weight_kg: Number(targetWeight) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Your goal</h2>
      <div className="space-y-1">
        <Label htmlFor="goal">Goal</Label>
        <Select value={goal} onValueChange={v => setGoal(v as Goal)}>
          <SelectTrigger id="goal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lose">Lose weight</SelectItem>
            <SelectItem value="gain">Gain muscle</SelectItem>
            <SelectItem value="maintain">Maintain / general health</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="target-weight">Target weight (kg)</Label>
        <Input
          id="target-weight"
          type="number"
          step="0.1"
          value={targetWeight}
          onChange={e => setTargetWeight(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {errors.target_weight_kg && <p className="text-sm text-destructive">{errors.target_weight_kg}</p>}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
```

- [ ] **Step 8: Run test — verify pass**

```bash
npm test -- --testPathPattern="step-goal"
```
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 9: Create components/onboarding/step-activity.tsx** (no separate test — validation is covered by validation.test.ts)

```tsx
// components/onboarding/step-activity.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateWorkoutDays } from '@/lib/validation'
import type { ActivityLevel, ExperienceLevel, OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'activity_level' | 'experience_level' | 'workout_days_per_week'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepActivity({ onNext, defaultValues }: Props) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    defaultValues.activity_level ?? 'moderately_active'
  )
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    defaultValues.experience_level ?? 'beginner'
  )
  const [workoutDays, setWorkoutDays] = useState<number | ''>(
    defaultValues.workout_days_per_week ?? ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateWorkoutDays(Number(workoutDays))
    if (err) newErrors.workout_days_per_week = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({
      activity_level: activityLevel,
      experience_level: experienceLevel,
      workout_days_per_week: Number(workoutDays),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Activity & experience</h2>
      <div className="space-y-1">
        <Label htmlFor="activity">Activity level</Label>
        <Select value={activityLevel} onValueChange={v => setActivityLevel(v as ActivityLevel)}>
          <SelectTrigger id="activity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
            <SelectItem value="lightly_active">Lightly active (1–3 days/week)</SelectItem>
            <SelectItem value="moderately_active">Moderately active (3–5 days/week)</SelectItem>
            <SelectItem value="very_active">Very active (6–7 days/week)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="experience">Fitness experience</Label>
        <Select value={experienceLevel} onValueChange={v => setExperienceLevel(v as ExperienceLevel)}>
          <SelectTrigger id="experience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner (&lt; 1 year)</SelectItem>
            <SelectItem value="intermediate">Intermediate (1–3 years)</SelectItem>
            <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="workout-days">Workout days per week</Label>
        <Input
          id="workout-days"
          type="number"
          min={1}
          max={7}
          value={workoutDays}
          onChange={e => setWorkoutDays(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {errors.workout_days_per_week && (
          <p className="text-sm text-destructive">{errors.workout_days_per_week}</p>
        )}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
```

- [ ] **Step 10: Create components/onboarding/step-cuisine.tsx**

```tsx
// components/onboarding/step-cuisine.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateCuisine } from '@/lib/validation'
import type { OnboardingData } from '@/lib/types'

interface Props {
  onSubmit: (data: Pick<OnboardingData, 'cuisine_preference' | 'dietary_restrictions'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepCuisine({ onSubmit, defaultValues }: Props) {
  const [cuisine, setCuisine] = useState(defaultValues.cuisine_preference ?? '')
  const [restrictions, setRestrictions] = useState(
    (defaultValues.dietary_restrictions ?? []).join(', ')
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateCuisine(cuisine)
    if (err) newErrors.cuisine_preference = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    const dietary_restrictions = restrictions
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    await onSubmit({ cuisine_preference: cuisine.trim(), dietary_restrictions })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Food preferences</h2>
      <div className="space-y-1">
        <Label htmlFor="cuisine">Cuisine preference</Label>
        <Input
          id="cuisine"
          type="text"
          placeholder="e.g. Indian, Mediterranean"
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
        />
        {errors.cuisine_preference && (
          <p className="text-sm text-destructive">{errors.cuisine_preference}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="restrictions">Dietary restrictions (comma-separated, optional)</Label>
        <Input
          id="restrictions"
          type="text"
          placeholder="e.g. no fish, no pork"
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Leave blank if none</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Setting up your plan…' : 'Finish setup'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 11: Run all tests**

```bash
npm test
```
Expected: PASS — 23 tests, 0 failures (16 validation + 4 step-basic-stats + 3 step-goal).

- [ ] **Step 12: Commit**

```bash
git add components/onboarding/ __tests__/onboarding/
git commit -m "feat: add onboarding step components with validation"
```

---

## Task 8: Onboarding Wizard Page

**Files:**
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Create app/onboarding/page.tsx**

```tsx
// app/onboarding/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepBasicStats from '@/components/onboarding/step-basic-stats'
import StepGoal from '@/components/onboarding/step-goal'
import StepActivity from '@/components/onboarding/step-activity'
import StepCuisine from '@/components/onboarding/step-cuisine'
import { Card, CardContent } from '@/components/ui/card'
import type { OnboardingData } from '@/lib/types'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
    setStep(prev => prev + 1)
  }

  const handleSubmit = async (stepData: Partial<OnboardingData>) => {
    const fullData = { ...data, ...stepData } as OnboardingData
    setSubmitError(null)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setSubmitError('Session expired — please log in again.')
      return
    }

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      ...fullData,
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground text-center">Step {step} of 4</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 1 && <StepBasicStats onNext={handleNext} defaultValues={data} />}
            {step === 2 && <StepGoal onNext={handleNext} defaultValues={data} />}
            {step === 3 && <StepActivity onNext={handleNext} defaultValues={data} />}
            {step === 4 && <StepCuisine onSubmit={handleSubmit} defaultValues={data} />}
            {submitError && (
              <p className="mt-3 text-sm text-destructive text-center">{submitError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual test — complete onboarding**

```bash
npm run dev
```
1. Sign up with a new test account at `/signup`
2. Confirm redirect to `/onboarding`
3. Fill in all 4 steps with valid data (e.g. age: 28, weight: 75, height: 175, goal: lose, target: 70, activity: moderately_active, experience: beginner, days: 4, cuisine: Indian, restrictions: no fish)
4. Click "Finish setup"
5. Expected: Redirect to `/dashboard`
6. Verify in Supabase dashboard → Table Editor → `profiles` → confirm new row with correct data

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add 4-step onboarding wizard"
```

---

## Task 9: Authenticated App Layout + Placeholder Pages + Profile Gate

**Files:**
- Create: `app/page.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/meals/page.tsx`
- Create: `app/(app)/workouts/page.tsx`
- Create: `app/(app)/progress/page.tsx`
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Create app/page.tsx (root redirect)**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Create app/(app)/layout.tsx**

This layout runs on the server, checks if the user has a profile, and redirects to `/onboarding` if not.

```tsx
// app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar nav */}
      <nav className="w-56 border-r bg-card p-4 flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted-foreground mb-4">FitAI</p>
        {[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/meals', label: 'Meal Plan' },
          { href: '/workouts', label: 'Workouts' },
          { href: '/progress', label: 'Progress' },
          { href: '/settings', label: 'Settings' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder pages**

```tsx
// app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return <h1 className="text-2xl font-bold">Dashboard — coming in Plan 4</h1>
}
```

```tsx
// app/(app)/meals/page.tsx
export default function MealsPage() {
  return <h1 className="text-2xl font-bold">Meal Plan — coming in Plan 2</h1>
}
```

```tsx
// app/(app)/workouts/page.tsx
export default function WorkoutsPage() {
  return <h1 className="text-2xl font-bold">Workouts — coming in Plan 3</h1>
}
```

```tsx
// app/(app)/progress/page.tsx
export default function ProgressPage() {
  return <h1 className="text-2xl font-bold">Progress — coming in Plan 5</h1>
}
```

```tsx
// app/(app)/settings/page.tsx
export default function SettingsPage() {
  return <h1 className="text-2xl font-bold">Settings — coming in Plan 3</h1>
}
```

- [ ] **Step 4: Manual test — full flow**

```bash
npm run dev
```

1. Open `http://localhost:3000` → confirm redirect to `/login`
2. Log in with the test user that completed onboarding → confirm redirect to `/dashboard`, nav sidebar visible
3. Create a second test account (no onboarding) → log in → confirm redirect to `/onboarding`
4. Navigate directly to `/dashboard` while logged out → confirm redirect to `/login`

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: PASS — 23 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx "app/(app)/"
git commit -m "feat: add authenticated app layout with profile gate and placeholder pages"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Next.js 15 App Router scaffold
- ✅ Supabase email/password auth (login + signup pages)
- ✅ `profiles` table with all spec fields + RLS
- ✅ 4-step onboarding wizard (basic stats, goal, activity, cuisine+restrictions)
- ✅ Cuisine preference + dietary restrictions collected
- ✅ Middleware protects app routes; redirects authenticated users away from auth pages
- ✅ App layout redirects to `/onboarding` if no profile
- ✅ Placeholder pages for all 5 main sections

**Placeholder scan:** None found.

**Type consistency:** `OnboardingData` defined in Task 2 (`lib/types.ts`) used consistently in step components (Tasks 7–8) and the wizard page (Task 8). `validateAge`, `validateWeight`, etc. defined in Task 2 used in step components in Task 7. All match.
