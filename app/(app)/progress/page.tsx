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
