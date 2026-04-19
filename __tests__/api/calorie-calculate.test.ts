jest.mock('@/lib/supabase/server')

import { POST } from '@/app/api/calorie/calculate/route'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeMockSupabase(user: { id: string } | null, profile: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: profile, error: profile ? null : { message: 'not found' } }),
        }),
      }),
    }),
  }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/calorie/calculate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase(null, null) as never)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when profile not found', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }, null) as never)
    const res = await POST()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Profile not found' })
  })

  it('returns calorie targets computed from profile', async () => {
    // male, 28yr, 75kg, 175cm, lose, moderately_active
    // BMI=24.5 (normal), BMR=1708.75, TDEE=2648.6, deficit=-300 → 2349 kcal
    const profile = { sex: 'male', age: 28, weight_kg: 75, height_cm: 175, goal: 'lose', activity_level: 'moderately_active' }
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }, profile) as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daily_calories).toBe(2349)
    expect(body.protein_g).toBe(150)
    expect(body.fat_g).toBe(65)
    expect(body.carbs_g).toBe(291)
    expect(body.bmi).toBe(24.5)
    expect(body.bmi_category).toBe('normal')
  })

  it('applies female BMR formula and higher floor', async () => {
    // female, 30yr, 60kg, 165cm, maintain, sedentary
    // BMR = 10*60 + 6.25*165 - 5*30 - 161 = 600+1031.25-150-161 = 1320.25
    // TDEE = 1320.25 * 1.2 = 1584.3, deficit=0 → 1584
    // floor = 1200, so 1584 kcal
    const profile = { sex: 'female', age: 30, weight_kg: 60, height_cm: 165, goal: 'maintain', activity_level: 'sedentary' }
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-2' }, profile) as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daily_calories).toBeGreaterThanOrEqual(1200)
    expect(body.bmi).toBeGreaterThan(0)
  })
})
