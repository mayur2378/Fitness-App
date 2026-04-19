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
