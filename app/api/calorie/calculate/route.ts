import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCalorieTargets } from '@/lib/calorie-utils'

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('sex, age, weight_kg, height_cm, goal, activity_level')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(calculateCalorieTargets(profile))
}
