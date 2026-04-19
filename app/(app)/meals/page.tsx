import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateCalorieTargets } from '@/lib/calorie-utils'
import MealsClient from './client'

export default async function MealsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('sex, age, weight_kg, height_cm, goal, activity_level')
    .eq('user_id', user.id)
    .maybeSingle()

  const targets = profile ? calculateCalorieTargets(profile) : null

  const { data: activePlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const items = activePlan
    ? await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', activePlan.id)
        .then(({ data }) => data ?? [])
    : []

  const today = new Date().toISOString().split('T')[0]
  const { data: todayLogs } = await supabase
    .from('meal_logs')
    .select('meal_plan_item_id')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('eaten', true)

  const eatenItemIds = (todayLogs ?? [])
    .map(l => l.meal_plan_item_id)
    .filter(Boolean) as string[]

  return (
    <MealsClient
      key={activePlan?.id ?? 'no-plan'}
      activePlan={activePlan}
      items={items}
      eatenItemIds={eatenItemIds}
      userId={user.id}
      targets={targets}
    />
  )
}
