import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'
import { getCurrentWeekStart } from '@/lib/meal-utils'
import type { CalorieTargets, DayOfWeek, MealType } from '@/lib/types'

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
    .select('age, weight_kg, height_cm, goal, activity_level, cuisine_preference, dietary_restrictions')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Step 1: get calorie targets
  let targets: CalorieTargets
  try {
    const caloriePrompt = `Calculate the daily calorie target and macro split for this user.

Age: ${profile.age} years
Weight: ${profile.weight_kg} kg
Height: ${profile.height_cm} cm
Goal: ${profile.goal} (lose=fat loss -400 kcal, gain=muscle +300 kcal, maintain=0)
Activity level: ${profile.activity_level}

Use Mifflin-St Jeor formula (male baseline: BMR = 10×weight + 6.25×height - 5×age + 5).
Activity multipliers: sedentary=1.2, lightly_active=1.375, moderately_active=1.55, very_active=1.725
Macros: protein=2g/kg body weight, fat=25% of total calories, carbs=remaining calories.
Round all values to the nearest integer.

Respond with ONLY a JSON object, no markdown:
{"daily_calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}`

    const calorieRaw = await callClaude(caloriePrompt, 256)
    targets = JSON.parse(calorieRaw)
  } catch {
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 2: generate 7-day meal plan
  const restrictions = profile.dietary_restrictions?.length > 0
    ? profile.dietary_restrictions.join(', ')
    : 'none'

  const mealPrompt = `Generate a 7-day meal plan.

Daily targets: ${targets.daily_calories} kcal | Protein: ${targets.protein_g}g | Carbs: ${targets.carbs_g}g | Fat: ${targets.fat_g}g
Cuisine preference: ${profile.cuisine_preference}
Dietary restrictions: ${restrictions}

Return ONLY a JSON array, no markdown:
[{"day":"mon","meals":[{"meal_type":"breakfast","name":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},{"meal_type":"lunch",...},{"meal_type":"dinner",...},{"meal_type":"snack",...}]},... repeat for tue,wed,thu,fri,sat,sun]

Rules:
- Each day has exactly 4 meals: breakfast, lunch, dinner, snack
- Total daily calories within ±50 kcal of the target
- Strictly honor all dietary restrictions
- Use specific, descriptive dish names (e.g. "Masala Oats with Spinach" not just "Oatmeal")
- Meals should be primarily ${profile.cuisine_preference} cuisine`

  let days: DayPayload[]
  try {
    const planRaw = await callClaude(mealPrompt, 4096)
    days = JSON.parse(planRaw)
  } catch {
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 3: archive existing active plans
  await supabase
    .from('meal_plans')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Step 4: insert new meal plan
  const { data: mealPlan, error: planInsertError } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, week_start_date: getCurrentWeekStart(), status: 'active' })
    .select()
    .single()

  if (planInsertError || !mealPlan) {
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  // Step 5: insert items
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

  const { error: itemsError } = await supabase.from('meal_plan_items').insert(items)

  if (itemsError) {
    // Rollback: delete the plan row to avoid leaving an empty plan
    await supabase.from('meal_plans').delete().eq('id', mealPlan.id)
    return NextResponse.json({ error: 'Plan generation failed — try again.' }, { status: 500 })
  }

  return NextResponse.json({ plan: mealPlan, items, targets })
}
