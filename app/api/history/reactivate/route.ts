import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekStart } from '@/lib/meal-utils'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fix 1: Guard request.json() against malformed body
  let type: string, planId: string
  try {
    const body = await request.json()
    type = body.type
    planId = body.planId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (type !== 'meal' && type !== 'workout') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const newWeekStart = getCurrentWeekStart()

  if (type === 'meal') {
    const { data: plan } = await supabase
      .from('meal_plans')
      .select('id, user_id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Fix 3: Check items fetch error
    const { data: items, error: itemsFetchError } = await supabase
      .from('meal_plan_items')
      .select('day_of_week, meal_type, name, calories, protein_g, carbs_g, fat_g')
      .eq('meal_plan_id', planId)

    if (itemsFetchError) {
      console.error('[history/reactivate] meal items fetch failed:', itemsFetchError)
      return NextResponse.json({ error: 'Failed to fetch plan items' }, { status: 500 })
    }

    // Fix 3: Log archive update error (non-fatal)
    const { error: archiveError } = await supabase
      .from('meal_plans')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (archiveError) {
      console.error('[history/reactivate] meal archive update failed:', archiveError)
    }

    const { data: newPlan, error: newPlanError } = await supabase
      .from('meal_plans')
      .insert({ user_id: user.id, week_start_date: newWeekStart, status: 'active' })
      .select()
      .single()

    if (newPlanError || !newPlan) {
      console.error('[history/reactivate] meal new plan insert failed:', newPlanError)
      return NextResponse.json({ error: 'Failed to create new plan' }, { status: 500 })
    }

    const newItems = (items ?? []).map(item => ({ ...item, meal_plan_id: newPlan.id }))
    if (newItems.length > 0) {
      const { error: itemsError } = await supabase.from('meal_plan_items').insert(newItems)
      if (itemsError) {
        // Fix 2: Rollback newly created plan on items insert failure
        console.error('[history/reactivate] meal items insert failed:', itemsError)
        const { error: rollbackError } = await supabase.from('meal_plans').delete().eq('id', newPlan.id)
        if (rollbackError) console.error('[history/reactivate] rollback failed:', rollbackError)
        return NextResponse.json({ error: 'Failed to copy plan items' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  }

  // workout
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, user_id')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Fix 3: Check items fetch error
  const { data: items, error: itemsFetchError } = await supabase
    .from('workout_plan_items')
    .select('day_of_week, name, exercises')
    .eq('workout_plan_id', planId)

  if (itemsFetchError) {
    console.error('[history/reactivate] workout items fetch failed:', itemsFetchError)
    return NextResponse.json({ error: 'Failed to fetch plan items' }, { status: 500 })
  }

  // Fix 3: Log archive update error (non-fatal)
  const { error: archiveError } = await supabase
    .from('workout_plans')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (archiveError) {
    console.error('[history/reactivate] workout archive update failed:', archiveError)
  }

  const { data: newPlan, error: newPlanError } = await supabase
    .from('workout_plans')
    .insert({ user_id: user.id, week_start_date: newWeekStart, status: 'active' })
    .select()
    .single()

  if (newPlanError || !newPlan) {
    console.error('[history/reactivate] workout new plan insert failed:', newPlanError)
    return NextResponse.json({ error: 'Failed to create new plan' }, { status: 500 })
  }

  const newItems = (items ?? []).map(item => ({ ...item, workout_plan_id: newPlan.id }))
  if (newItems.length > 0) {
    const { error: itemsError } = await supabase.from('workout_plan_items').insert(newItems)
    if (itemsError) {
      // Fix 2: Rollback newly created plan on items insert failure
      console.error('[history/reactivate] workout items insert failed:', itemsError)
      const { error: rollbackError } = await supabase.from('workout_plans').delete().eq('id', newPlan.id)
      if (rollbackError) console.error('[history/reactivate] rollback failed:', rollbackError)
      return NextResponse.json({ error: 'Failed to copy plan items' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
