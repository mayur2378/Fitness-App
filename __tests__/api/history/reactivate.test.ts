jest.mock('@/lib/supabase/server')
jest.mock('@/lib/meal-utils', () => ({
  ...jest.requireActual('@/lib/meal-utils'),
  getCurrentWeekStart: jest.fn().mockReturnValue('2026-04-21'),
}))

import { POST } from '@/app/api/history/reactivate/route'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeRequest(body: object) {
  return new Request('http://localhost/api/history/reactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const MOCK_MEAL_PLAN = { id: 'mp-1', user_id: 'uid-1' }
const MOCK_NEW_MEAL_PLAN = {
  id: 'mp-new', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '',
}
const MOCK_MEAL_ITEMS = [
  { day_of_week: 'mon', meal_type: 'breakfast', name: 'Oats', calories: 300, protein_g: 10, carbs_g: 50, fat_g: 5 },
]

function makeMealSupabase(overrides: {
  planData?: object | null;
  newPlanError?: object | null;
  itemsInsertError?: object | null;
} = {}) {
  const newPlanInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: overrides.newPlanError ? null : MOCK_NEW_MEAL_PLAN,
        error: overrides.newPlanError ?? null,
      }),
    }),
  })
  const archiveUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  })
  const itemsInsert = jest.fn().mockResolvedValue({
    error: overrides.itemsInsertError ?? null,
  })
  // For rollback delete after items insert failure
  const planDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'meal_plans') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: overrides.planData !== undefined ? overrides.planData : MOCK_MEAL_PLAN,
                  error: null,
                }),
              }),
            }),
          }),
          update: archiveUpdate,
          insert: newPlanInsert,
          delete: planDelete,
        }
      }
      if (table === 'meal_plan_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: MOCK_MEAL_ITEMS, error: null }),
          }),
          insert: itemsInsert,
        }
      }
      return {}
    }),
  }

  return { supabase, newPlanInsert, archiveUpdate, itemsInsert, planDelete }
}

const MOCK_WORKOUT_PLAN = { id: 'wp-1', user_id: 'uid-1' }
const MOCK_NEW_WORKOUT_PLAN = {
  id: 'wp-new', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '',
}
const MOCK_WORKOUT_ITEMS = [
  { day_of_week: 'mon', name: 'Push Day', exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight_kg: 60 }] },
]

function makeWorkoutSupabase(overrides: { planData?: object | null } = {}) {
  const newPlanInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: MOCK_NEW_WORKOUT_PLAN, error: null }),
    }),
  })
  const archiveUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  })
  const itemsInsert = jest.fn().mockResolvedValue({ error: null })

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'workout_plans') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: overrides.planData !== undefined ? overrides.planData : MOCK_WORKOUT_PLAN,
                  error: null,
                }),
              }),
            }),
          }),
          update: archiveUpdate,
          insert: newPlanInsert,
        }
      }
      if (table === 'workout_plan_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: MOCK_WORKOUT_ITEMS, error: null }),
          }),
          insert: itemsInsert,
        }
      }
      return {}
    }),
  }

  return { supabase, newPlanInsert, archiveUpdate, itemsInsert }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/history/reactivate', () => {
  it('returns 400 for invalid type', async () => {
    const { supabase } = makeMealSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'invalid', planId: 'mp-1' }) as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid type')
  })

  it('returns 401 when not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } }),
      },
      from: jest.fn(),
    }
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'mp-1' }) as any)
    expect(res.status).toBe(401)
  })

  it('returns 404 when meal plan not found', async () => {
    const { supabase } = makeMealSupabase({ planData: null })
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'nonexistent' }) as any)
    expect(res.status).toBe(404)
  })

  // Fix 5: Add workout 404 test
  it('returns 404 when workout plan not found', async () => {
    const { supabase } = makeWorkoutSupabase({ planData: null })
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'workout', planId: 'nonexistent' }) as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Plan not found')
  })

  it('archives current active meal plan and creates a new copy with current week start', async () => {
    const { supabase, archiveUpdate, newPlanInsert, itemsInsert } = makeMealSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'mp-1' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(archiveUpdate).toHaveBeenCalled()
    expect(newPlanInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active' })
    )
    expect(itemsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ meal_plan_id: 'mp-new', day_of_week: 'mon' }),
      ])
    )
  })

  it('archives current active workout plan and creates a new copy with current week start', async () => {
    const { supabase, archiveUpdate, newPlanInsert, itemsInsert } = makeWorkoutSupabase()
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'workout', planId: 'wp-1' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(archiveUpdate).toHaveBeenCalled()
    expect(newPlanInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active' })
    )
    expect(itemsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ workout_plan_id: 'wp-new', day_of_week: 'mon' }),
      ])
    )
  })

  // Fix 6: Add items-insert failure test
  it('returns 500 when items insert fails', async () => {
    const { supabase, planDelete } = makeMealSupabase({
      itemsInsertError: { message: 'DB error' },
    })
    mockCreateClient.mockResolvedValue(supabase as any)

    const res = await POST(makeRequest({ type: 'meal', planId: 'mp-1' }) as any)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to copy plan items')
    // Verify rollback: the new plan should be deleted
    expect(planDelete).toHaveBeenCalled()
  })
})
