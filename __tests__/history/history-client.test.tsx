jest.mock('@/lib/supabase/client')

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HistoryClient from '@/app/(app)/history/client'
import type { HistoryWeek } from '@/lib/types'

const MOCK_WEEKS: HistoryWeek[] = [
  {
    weekStart: '2026-04-07',
    mealPlan: {
      id: 'mp-1',
      user_id: 'uid-1',
      week_start_date: '2026-04-07',
      status: 'archived',
      created_at: '',
      items: [
        {
          id: 'mpi-1',
          meal_plan_id: 'mp-1',
          day_of_week: 'mon',
          meal_type: 'breakfast',
          name: 'Oats',
          calories: 300,
          protein_g: 10,
          carbs_g: 50,
          fat_g: 5,
        },
      ],
    },
    workoutPlan: {
      id: 'wp-1',
      user_id: 'uid-1',
      week_start_date: '2026-04-07',
      status: 'archived',
      created_at: '',
      items: [
        {
          id: 'wpi-1',
          workout_plan_id: 'wp-1',
          day_of_week: 'mon',
          name: 'Push Day',
          exercises: [],
        },
      ],
    },
  },
]

beforeEach(() => jest.clearAllMocks())

describe('HistoryClient', () => {
  it('renders a week row for each week', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    expect(screen.getByText(/Apr 7/)).toBeInTheDocument()
  })

  it('shows empty state when weeks is empty', () => {
    render(<HistoryClient weeks={[]} userId="uid-1" />)
    expect(screen.getByText(/No past plans yet/)).toBeInTheDocument()
  })

  it('plan cards are hidden before expanding', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    expect(screen.queryByText('Meal Plan')).not.toBeInTheDocument()
    expect(screen.queryByText('Workout Plan')).not.toBeInTheDocument()
  })

  it('expands week row to show plan cards on click', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))
    expect(screen.getByText('Meal Plan')).toBeInTheDocument()
    expect(screen.getByText('Workout Plan')).toBeInTheDocument()
  })

  it('collapses week row on second click', () => {
    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    const toggle = screen.getByRole('button', { name: /Apr 7/ })
    fireEvent.click(toggle)
    expect(screen.getByText('Meal Plan')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('Meal Plan')).not.toBeInTheDocument()
  })

  it('calls reactivate API with correct payload when Re-activate clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    })

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0]) // first Re-activate = meal plan

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/history/reactivate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"meal"'),
        })
      )
    })
  })

  it('shows error alert on reactivation failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Server error' }),
    })

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    })
  })

  it('disables Re-activate button while reactivating', async () => {
    let resolveReactivate!: (value: unknown) => void
    global.fetch = jest.fn().mockReturnValue(
      new Promise(resolve => { resolveReactivate = resolve })
    )

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Re-activating/ })[0]).toBeDisabled()
    })

    resolveReactivate({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) })
  })

  it('removes reactivated meal plan from local state on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    })

    render(<HistoryClient weeks={MOCK_WEEKS} userId="uid-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Apr 7/ }))

    const buttons = screen.getAllByRole('button', { name: 'Re-activate' })
    fireEvent.click(buttons[0]) // meal plan button

    await waitFor(() => {
      // meal plan card should be gone, workout plan card should remain
      expect(screen.queryByText('Meal Plan')).not.toBeInTheDocument()
      expect(screen.getByText('Workout Plan')).toBeInTheDocument()
    })
  })
})
