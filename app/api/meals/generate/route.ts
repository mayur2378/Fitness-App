import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'
import { getCurrentWeekStart } from '@/lib/meal-utils'
import { calculateCalorieTargets } from '@/lib/calorie-utils'
import type { DayOfWeek, MealType } from '@/lib/types'

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}


type DayPayload = {
  day: string
  meals: { meal_type: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('sex, age, weight_kg, height_cm, goal, activity_level, cuisine_preference, dietary_restrictions')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Step 1: calculate calorie targets in code
  const targets = calculateCalorieTargets(profile)
  console.log('[generate] targets:', targets)

  // Step 2: generate 7-day meal plan
  const restrictions = profile.dietary_restrictions?.length > 0
    ? profile.dietary_restrictions.join(', ')
    : 'none'

  const mealPrompt = `You are a meal planner. Output ONLY a JSON array with no other text, explanation, or markdown.

CALORIE BUDGET: ${targets.daily_calories} kcal per day (MAXIMUM — do NOT exceed this)
- BMI category: ${targets.bmi_category} (BMI ${targets.bmi})
- Protein target: ${targets.protein_g}g | Fat: ${targets.fat_g}g | Carbs: ${targets.carbs_g}g
- Cuisine: ${profile.cuisine_preference}
- Dietary restrictions: ${restrictions}

RULES (non-negotiable):
1. Exactly 7 days: mon, tue, wed, thu, fri, sat, sun
2. Exactly 4 meals per day: breakfast, lunch, dinner, snack
3. Sum of meal calories per day MUST be ≤ ${targets.daily_calories} kcal (stay within 50 kcal below max)
4. Strictly honor all dietary restrictions
5. Use specific dish names (e.g. "Masala Oats with Spinach" not "Oatmeal")
6. Prefer ${profile.cuisine_preference} cuisine

Output this exact JSON array with no other text before or after:
[{"day":"mon","meals":[{"meal_type":"breakfast","name":"Dish Name","calories":350,"protein_g":12,"carbs_g":55,"fat_g":8},{"meal_type":"lunch","name":"Dish Name","calories":500,"protein_g":30,"carbs_g":60,"fat_g":12},{"meal_type":"dinner","name":"Dish Name","calories":550,"protein_g":35,"carbs_g":55,"fat_g":15},{"meal_type":"snack","name":"Dish Name","calories":120,"protein_g":6,"carbs_g":15,"fat_g":3}]},{"day":"tue","meals":[...]},{"day":"wed","meals":[...]},{"day":"thu","meals":[...]},{"day":"fri","meals":[...]},{"day":"sat","meals":[...]},{"day":"sun","meals":[...]}]`

  let days: DayPayload[]
  try {
    const planRaw = await callClaude(mealPrompt, 4096)
    console.log('[generate] raw meal plan (first 300 chars):', planRaw.slice(0, 300))
    days = JSON.parse(stripCodeFences(planRaw))
    console.log('[generate] parsed days count:', days.length, '| first day meals:', days[0]?.meals?.length)
  } catch (err) {
    console.error('[generate] meal plan step failed:', err)
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 3: insert new meal plan
  const { data: mealPlan, error: planInsertError } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, week_start_date: getCurrentWeekStart(), status: 'active' })
    .select()
    .single()

  if (planInsertError || !mealPlan) {
    console.error('[generate] plan insert failed:', planInsertError)
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 4: insert items
  const items = days.flatMap(d =>
    d.meals.map(meal => ({
      meal_plan_id: mealPlan.id,
      day_of_week: d.day as DayOfWeek,
      meal_type: meal.meal_type as MealType,
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    }))
  )

  console.log('[generate] inserting items count:', items.length)
  const { error: itemsError } = await supabase.from('meal_plan_items').insert(items)

  if (itemsError) {
    console.error('[generate] items insert failed:', itemsError)
    await supabase.from('meal_plans').delete().eq('id', mealPlan.id)
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 5: archive previous active plans now that the new plan is fully saved
  await supabase
    .from('meal_plans')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('id', mealPlan.id)

  return NextResponse.json({ plan: mealPlan, items, targets })
}
