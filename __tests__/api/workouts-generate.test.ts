jest.mock('@/lib/supabase/server')
jest.mock('@/lib/claude')
jest.mock('@/lib/meal-utils', () => ({
  ...jest.requireActual('@/lib/meal-utils'),
  getCurrentWeekStart: jest.fn().mockReturnValue('2026-04-21'),
}))

import { POST } from '@/app/api/workouts/generate/route'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>

const MOCK_PROFILE = {
  goal: 'lose',
  experience_level: 'beginner',
  workout_days_per_week: 3,
}

const MOCK_PLAN_DAYS = [
  {
    day: 'mon',
    name: 'Full Body A',
    exercises: [
      { name: 'Squat', sets: 3, reps: 10, weight_kg: 40 },
      { name: 'Push-Up', sets: 3, reps: 12, weight_kg: 0 },
    ],
  },
  {
    day: 'wed',
    name: 'Full Body B',
    exercises: [{ name: 'Deadlift', sets: 3, reps: 10, weight_kg: 50 }],
  },
  {
    day: 'fri',
    name: 'Full Body C',
    exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight_kg: 30 }],
  },
]

function makeMockSupabase(itemsInsertError: { message: string } | null = null) {
  const mockPlan = { id: 'plan-uuid', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '' }
  const mockDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
  const supabase = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }) },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
            }),
          }),
        }
      }
      if (table === 'workout_plans') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                neq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
          delete: mockDelete,
        }
      }
      if (table === 'workout_plan_items') {
        return {
          insert: jest.fn().mockResolvedValue({ error: itemsInsertError }),
        }
      }
      return {}
    }),
    _mockDelete: mockDelete,
  }
  return supabase
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/workouts/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never)
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when profile not found', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    } as never)
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Profile not found' })
  })

  it('returns 200 with plan and items on success', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    mockCallClaude.mockResolvedValueOnce(JSON.stringify(MOCK_PLAN_DAYS))
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan).toBeDefined()
    expect(body.plan.id).toBe('plan-uuid')
    expect(body.items).toHaveLength(3)
    expect(body.items[0].day_of_week).toBe('mon')
    expect(body.items[0].exercises).toHaveLength(2)
  })

  it('returns 500 when Claude returns invalid JSON', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    mockCallClaude.mockResolvedValueOnce('not valid json {{}')
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Workout plan generation failed — try again.' })
  })

  it('returns 500 and deletes plan when item insert fails', async () => {
    const mockSupabase = makeMockSupabase({ message: 'insert failed' })
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockCallClaude.mockResolvedValueOnce(JSON.stringify(MOCK_PLAN_DAYS))
    const res = await POST(new Request('http://localhost/api/workouts/generate', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Workout plan generation failed — try again.' })
    expect(mockSupabase._mockDelete).toHaveBeenCalled()
  })
})
