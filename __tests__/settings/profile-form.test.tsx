jest.mock('@/lib/supabase/client')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileForm from '@/components/settings/profile-form'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const baseProfile: Profile = {
  id: 'profile-1',
  user_id: 'uid-1',
  sex: 'male',
  age: 28,
  weight_kg: 75,
  height_cm: 175,
  goal: 'lose',
  target_weight_kg: 65,
  activity_level: 'moderately_active',
  experience_level: 'beginner',
  workout_days_per_week: 3,
  cuisine_preference: 'Indian',
  dietary_restrictions: [],
  created_at: '',
  updated_at: '',
}

function makeMockSupabase(updateError: { message: string } | null = null) {
  return {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      }),
    }),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateClient.mockReturnValue(makeMockSupabase() as never)
})

describe('ProfileForm', () => {
  it('renders profile fields pre-filled from profile prop', () => {
    render(<ProfileForm profile={baseProfile} />)
    expect(screen.getByDisplayValue('28')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Indian')).toBeInTheDocument()
  })

  it('shows recalculate prompt when goal changes and form is saved successfully', async () => {
    render(<ProfileForm profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /gain muscle/i }))
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/calorie targets may have changed/i)).toBeInTheDocument()
  })

  it('does not show recalculate prompt when only unrelated field changes', async () => {
    render(<ProfileForm profile={baseProfile} />)
    const cuisineInput = screen.getByLabelText(/cuisine/i)
    await userEvent.clear(cuisineInput)
    await userEvent.type(cuisineInput, 'Mediterranean')
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(screen.queryByText(/calorie targets may have changed/i)).not.toBeInTheDocument()
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument()
    })
  })

  it('shows error message when save fails', async () => {
    mockCreateClient.mockReturnValue(makeMockSupabase({ message: 'db error' }) as never)
    render(<ProfileForm profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/could not save profile/i)).toBeInTheDocument()
  })
})
