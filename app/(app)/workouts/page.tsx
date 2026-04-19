import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutsClient from './client'

export default async function WorkoutsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: activePlan } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const items = activePlan
    ? await supabase
        .from('workout_plan_items')
        .select('*')
        .eq('workout_plan_id', activePlan.id)
        .then(({ data }) => data ?? [])
    : []

  const today = new Date().toISOString().split('T')[0]
  const { data: todayLogs } = await supabase
    .from('workout_logs')
    .select('workout_plan_item_id')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('completed', true)

  const loggedItemIds = (todayLogs ?? [])
    .map(l => l.workout_plan_item_id)
    .filter(Boolean) as string[]

  return (
    <WorkoutsClient
      key={activePlan?.id ?? 'no-plan'}
      activePlan={activePlan}
      items={items}
      loggedItemIds={loggedItemIds}
      userId={user.id}
    />
  )
}
