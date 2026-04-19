jest.mock('@/lib/supabase/server')
jest.mock('@/lib/claude')

import { POST } from '@/app/api/meals/substitute/route'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/claude'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>

const MOCK_ITEM = {
  id: 'item-1', meal_plan_id: 'plan-1', day_of_week: 'mon', meal_type: 'breakfast',
  name: 'Masala Oats', calories: 350, protein_g: 12, carbs_g: 55, fat_g: 8,
}
const MOCK_PROFILE = { cuisine_preference: 'Indian', dietary_restrictions: ['no fish'] }
const MOCK_SUBSTITUTE = { name: 'Poha with Vegetables', calories: 340, protein_g: 11, carbs_g: 57, fat_g: 7 }

function makeMockSupabase(user: { id: string } | null) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'meal_plan_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: MOCK_ITEM, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
            }),
          }),
        }
      }
      return {}
    }),
  }
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/meals/substitute', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase(null) as never)
    const res = await POST(new Request('http://localhost/api/meals/substitute', {
      method: 'POST',
      body: JSON.stringify({ item_id: 'item-1' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when item_id missing', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }) as never)
    const res = await POST(new Request('http://localhost/api/meals/substitute', {
      method: 'POST',
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'item_id is required' })
  })

  it('returns substitute meal on success', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }) as never)
    mockCallClaude.mockResolvedValue(JSON.stringify(MOCK_SUBSTITUTE))
    const res = await POST(new Request('http://localhost/api/meals/substitute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: 'item-1' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.substitute).toEqual(MOCK_SUBSTITUTE)
  })

  it('returns 500 when Claude returns invalid JSON', async () => {
    mockCreateClient.mockResolvedValue(makeMockSupabase({ id: 'uid-1' }) as never)
    mockCallClaude.mockResolvedValue('not json')
    const res = await POST(new Request('http://localhost/api/meals/substitute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: 'item-1' }),
    }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No good substitute found — try again.' })
  })
})
