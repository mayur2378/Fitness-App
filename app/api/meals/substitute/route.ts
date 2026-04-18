import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.item_id) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
  }

  const { data: item, error: itemError } = await supabase
    .from('meal_plan_items')
    .select('*')
    .eq('id', body.item_id)
    .single()

  if (itemError || !item) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cuisine_preference, dietary_restrictions')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const restrictions = Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0
    ? profile.dietary_restrictions.join(', ')
    : 'none'

  const prompt = `Suggest a substitute meal for:
Name: ${item.name}
Calories: ${item.calories} kcal | Protein: ${item.protein_g}g | Carbs: ${item.carbs_g}g | Fat: ${item.fat_g}g
Cuisine preference: ${profile.cuisine_preference}
Dietary restrictions: ${restrictions}

Return ONLY a JSON object, no markdown:
{"name":"...","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}

Rules:
- Stay within ±50 kcal and ±5g per macro of the original
- Strictly honor all dietary restrictions
- Suggest a different dish from the original
- Prefer ${profile.cuisine_preference} cuisine`

  try {
    const raw = await callClaude(prompt, 256)
    const substitute = JSON.parse(raw)
    return NextResponse.json({ substitute })
  } catch {
    return NextResponse.json({ error: 'No good substitute found — try again.' }, { status: 500 })
  }
}
