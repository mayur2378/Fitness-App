jest.mock('@/lib/supabase/server')
jest.mock('@/lib/claude')
jest.mock('@/lib/meal-utils', () => ({
  ...jest.requireActual('@/lib/meal-utils'),
  getCurrentWeekStart: jest.fn().mockReturnValue('2026-04-21'),
}))

import { POST } from '@/app/api/meals/generate/route'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>

const MOCK_PROFILE = {
  sex: 'male', age: 28, weight_kg: 75, height_cm: 175, goal: 'lose',
  activity_level: 'moderately_active', cuisine_preference: 'Indian',
  dietary_restrictions: ['no fish'],
}

// Matches calculateCalorieTargets({ sex:'male', age:28, weight_kg:75, height_cm:175, goal:'lose', activity_level:'moderately_active' })
const MOCK_TARGETS = { daily_calories: 2349, protein_g: 150, carbs_g: 291, fat_g: 65, bmi: 24.5, bmi_category: 'normal' }

const MOCK_PLAN_DAYS = [
  {
    day: 'mon',
    meals: [
      { meal_type: 'breakfast', name: 'Masala Oats', calories: 350, protein_g: 12, carbs_g: 55, fat_g: 8 },
      { meal_type: 'lunch', name: 'Dal Rice', calories: 550, protein_g: 22, carbs_g: 90, fat_g: 10 },
      { meal_type: 'dinner', name: 'Paneer Tikka', calories: 650, protein_g: 40, carbs_g: 60, fat_g: 22 },
      { meal_type: 'snack', name: 'Banana', calories: 120, protein_g: 2, carbs_g: 30, fat_g: 0 },
    ],
  },
]

function makeMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockPlan = { id: 'plan-uuid', user_id: 'uid-1', week_start_date: '2026-04-21', status: 'active', created_at: '' }
  return {
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
      if (table === 'meal_plans') {
        return {
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ neq: jest.fn().mockResolvedValue({ error: null }) }) }) }),
          insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }) }) }),
          delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'meal_plan_items') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) }
      }
      return {}
    }),
    ...overrides,
  }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/meals/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never)
    const res = await POST(new Request('http://localhost/api/meals/generate', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('generates and returns meal plan on success', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    // Route now calls Claude once (for meals only — calorie targets computed in code)
    mockCallClaude.mockResolvedValueOnce(JSON.stringify(MOCK_PLAN_DAYS))

    const res = await POST(new Request('http://localhost/api/meals/generate', { method: 'POST' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan).toBeDefined()
    expect(body.items).toHaveLength(4)
    expect(body.targets).toEqual(MOCK_TARGETS)
  })

  it('returns 500 when Claude returns invalid JSON for meal plan', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase() as never)
    mockCallClaude.mockResolvedValueOnce('not json')
    const res = await POST(new Request('http://localhost/api/meals/generate', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Plan generation failed — try again.' })
  })
})
