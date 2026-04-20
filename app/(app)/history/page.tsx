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
    const week: HistoryWeek = weekMap.get(plan.week_start_date) ?? { weekStart: plan.week_start_date }
    week.mealPlan = { ...rest, items: items ?? [] }
    weekMap.set(plan.week_start_date, week)
  }

  for (const plan of workoutPlans ?? []) {
    const { workout_plan_items: items, ...rest } = plan as WorkoutPlan & { workout_plan_items: WorkoutPlanItem[] }
    const week: HistoryWeek = weekMap.get(plan.week_start_date) ?? { weekStart: plan.week_start_date }
    week.workoutPlan = { ...rest, items: items ?? [] }
    weekMap.set(plan.week_start_date, week)
  }

  const weeks: HistoryWeek[] = Array.from(weekMap.values()).sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  )

  return <HistoryClient weeks={weeks} userId={user.id} />
}
