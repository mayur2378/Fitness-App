import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'
import type { CalorieTargets } from '@/lib/types'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, weight_kg, height_cm, goal, activity_level')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const prompt = `Calculate the daily calorie target and macro split for this user.

Age: ${profile.age} years
Weight: ${profile.weight_kg} kg
Height: ${profile.height_cm} cm
Goal: ${profile.goal} (lose=fat loss -400 kcal, gain=muscle +300 kcal, maintain=0)
Activity level: ${profile.activity_level}

Use Mifflin-St Jeor formula (male baseline: BMR = 10×weight + 6.25×height - 5×age + 5).
Activity multipliers: sedentary=1.2, lightly_active=1.375, moderately_active=1.55, very_active=1.725
Macros: protein=2g/kg body weight, fat=25% of total calories, carbs=remaining calories.
Round all values to the nearest integer.

Respond with ONLY a JSON object, no markdown, no explanation:
{"daily_calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}`

  try {
    const raw = await callClaude(prompt, 256)
    const targets: CalorieTargets = JSON.parse(raw)
    return NextResponse.json(targets)
  } catch {
    return NextResponse.json({ error: 'Failed to calculate calorie targets' }, { status: 500 })
  }
}
