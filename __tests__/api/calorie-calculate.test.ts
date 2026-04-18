jest.mock('@/lib/supabase/server')
jest.mock('@/lib/claude')

import { POST } from '@/app/api/calorie/calculate/route'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>

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

  it('returns calorie targets on success', async () => {
    const profile = { age: 28, weight_kg: 75, height_cm: 175, goal: 'lose', activity_level: 'moderately_active' }
    const targets = { daily_calories: 1900, protein_g: 165, carbs_g: 191, fat_g: 53 }
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }, profile) as never)
    mockCallClaude.mockResolvedValue(JSON.stringify(targets))
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(targets)
  })

  it('returns 500 when Claude returns invalid JSON', async () => {
    const profile = { age: 28, weight_kg: 75, height_cm: 175, goal: 'lose', activity_level: 'moderately_active' }
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }, profile) as never)
    mockCallClaude.mockResolvedValue('not valid json {{')
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to calculate calorie targets' })
  })
})
