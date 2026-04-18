# Fitness App Design Spec

**Goal:** A personal fitness web app (PWA) that generates AI-powered weekly meal and workout plans tailored to the user's goal, cuisine preference, and dietary restrictions — and actively adjusts those plans each week based on logged progress.

**Architecture:** Next.js 15 App Router frontend + Next.js API routes calling Claude server-side + Supabase (PostgreSQL, Auth, RLS). Hosted on Vercel. Designed multi-user from day one via Row Level Security; initially used by a single user.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Supabase JS SDK, Anthropic SDK (`claude-sonnet-4-6`), Vercel, pg_cron (Supabase)

---

## 1. Architecture

```
Browser / Mobile (PWA)
  └── Next.js 15 App Router (Vercel)
        ├── UI pages (React Server + Client Components)
        └── /app/api/ routes (server-side, call Claude + Supabase)
              └── Supabase Cloud
                    ├── PostgreSQL (data)
                    ├── Auth (email/password)
                    ├── Row Level Security (per-user data isolation)
                    └── pg_cron (Sunday evening weekly job)
```

- All Claude calls are server-side only. The Anthropic API key is never exposed to the browser.
- Supabase RLS ensures every query is automatically scoped to the authenticated user — no manual filtering needed in API routes.
- The weekly adjustment cycle is triggered by a Supabase `pg_cron` job firing Sunday evening → calls `/api/weekly/adjust` → saves proposed plan → user sees an in-app review banner.

---

## 2. User Profile (Onboarding)

Collected in a 4-step wizard shown once after signup. Stored in the `profiles` table.

| Field | Type | Notes |
|---|---|---|
| `age` | integer | years |
| `weight_kg` | float | current weight |
| `height_cm` | float | |
| `goal` | enum | `lose` / `gain` / `maintain` |
| `target_weight_kg` | float | |
| `activity_level` | enum | `sedentary` / `lightly_active` / `moderately_active` / `very_active` |
| `experience_level` | enum | `beginner` / `intermediate` / `advanced` |
| `workout_days_per_week` | integer | 1–7 |
| `cuisine_preference` | text | e.g. `"Indian"` |
| `dietary_restrictions` | text[] | e.g. `["no fish", "no pork"]` |

Submitting step 4 auto-triggers calorie calculation + first week's meal and workout plan generation.

---

## 3. Data Model

All tables include `user_id uuid references auth.users` with RLS policies enforcing `user_id = auth.uid()`.

### `profiles`
Stores the onboarding data above. One row per user.

### `meal_plans`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK |
| `week_start_date` | date (always Monday) |
| `status` | enum: `proposed` / `active` / `archived` |

### `meal_plan_items`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `meal_plan_id` | uuid FK |
| `day_of_week` | enum: `mon`–`sun` |
| `meal_type` | enum: `breakfast` / `lunch` / `dinner` / `snack` |
| `name` | text |
| `calories` | integer |
| `protein_g` | float |
| `carbs_g` | float |
| `fat_g` | float |

### `workout_plans`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK |
| `week_start_date` | date |
| `status` | enum: `proposed` / `active` / `archived` |

### `workout_plan_items`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `workout_plan_id` | uuid FK |
| `day_of_week` | enum: `mon`–`sun` |
| `name` | text (e.g. "Push Day") |
| `exercises` | JSONB array of `{name, sets, reps, weight_kg}` |

### `daily_logs`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK |
| `date` | date |
| `weight_kg` | float (nullable) |
| `notes` | text (nullable) |

### `meal_logs`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK |
| `date` | date |
| `meal_plan_item_id` | uuid FK (nullable — allows ad-hoc meals) |
| `name` | text |
| `calories` | integer |
| `protein_g` | float |
| `carbs_g` | float |
| `fat_g` | float |
| `eaten` | boolean |

### `workout_logs`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK |
| `date` | date |
| `workout_plan_item_id` | uuid FK (nullable) |
| `completed` | boolean |
| `notes` | text (nullable) |

---

## 4. AI Routes (Claude)

All routes are `POST`, server-side only, require a valid Supabase session. Every prompt includes the user's `cuisine_preference` and `dietary_restrictions` so restrictions are enforced consistently across all plan types.

| Route | Input | Output |
|---|---|---|
| `POST /api/calorie/calculate` | profile stats (age, weight, height, goal, activity level) | daily calorie target + macro split (protein/carbs/fat grams) |
| `POST /api/meals/generate` | profile + calorie targets | 7-day meal plan (all meals + macros per item) |
| `POST /api/meals/substitute` | current meal item + profile | single replacement meal matching same macros and cuisine |
| `POST /api/workouts/generate` | profile (goal, experience, workout days) | 7-day workout schedule (exercises, sets, reps, weights) |
| `POST /api/weekly/adjust` | last 7 days of logs (weight trend, meal adherence %, workout completion %) + current plan | adjusted meal + workout plan saved as `status: "proposed"` |
| `POST /api/progress/insights` | 4 weeks of logs | plain-English summary of progress and recommendations |

### Weekly Adjustment Cycle

1. Supabase `pg_cron` fires Sunday evening
2. Calls `/api/weekly/adjust` with the past week's aggregated logs
3. If logs are sparse (< 3 days logged), Claude makes conservative adjustments only
4. Proposed plan saved with `status: "proposed"` — existing active plan unchanged
5. User sees review banner on Dashboard; can approve, edit, or skip
6. If unreviewed by Wednesday midnight, plan auto-activates; previous plan archived

---

## 5. Pages

### Onboarding Wizard (shown once, blocks access to main app)
4 steps: Basic stats → Goal + target weight → Activity + experience + workout days → Cuisine + dietary restrictions. Completion auto-generates first week's plans.

### Dashboard (`/`)
- Today's calorie ring (consumed vs target)
- Macro breakdown (protein/carbs/fat progress bars)
- Today's workout card (name + completion toggle)
- Weight trend sparkline (last 30 days)
- "Week N plan ready — Review" banner (when proposed plan exists)

### Meal Plan (`/meals`)
- Weekly grid: Mon–Sun × breakfast/lunch/dinner/snack
- Each cell: meal name, calorie count, macros
- Tap cell: mark as eaten, swap meal (calls `/api/meals/substitute`), or log custom meal
- "Generate new plan" button

### Workouts (`/workouts`)
- Weekly schedule: one card per active workout day
- Each card: workout name, exercise list with sets/reps/target weight
- Mark complete; log actual weights used
- "Generate new plan" button

### Progress (`/progress`)
- Weight log: line chart over all time
- Weekly macro adherence: bar chart (% of days hitting each macro target)
- Workout completion rate: weekly bar chart
- AI Insights card: generated on demand or auto-refreshed weekly

### Settings (`/settings`)
- Edit all profile fields
- Changing goal or current weight prompts: "Recalculate calorie targets?"
- Email/password change via Supabase Auth

---

## 6. Error Handling

| Scenario | Behaviour |
|---|---|
| Claude unavailable | Toast: "Plan generation failed — try again." No partial data saved. Existing plan unchanged. |
| Sparse logs on Sunday adjustment | Claude makes conservative changes; plan generated with a note indicating sparse data |
| Meal substitute not found | Original meal kept; toast: "No good substitute found — try again." |
| Proposed plan not reviewed by Wednesday | Auto-activates silently; previous plan archived |
| Unauthenticated API request | 401 returned; all routes validate Supabase session server-side |
| Onboarding incomplete | Redirect to wizard; meal/workout pages inaccessible until profile exists |

---

## 7. Scope: Out of Scope (v1)

- Social features, sharing, leaderboards
- Integration with wearables (Apple Watch, Fitbit)
- Barcode scanning for food logging
- Push notifications (PWA install banner only)
- Paid tiers / billing
