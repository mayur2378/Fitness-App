jest.mock('@/lib/supabase/client')
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null, Cell: () => null, Line: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null,
  ReferenceLine: () => null, CartesianGrid: () => null,
}))

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgressClient from '@/app/(app)/progress/client'
import { createClient } from '@/lib/supabase/client'

const MOCK_WEIGHT_ENTRY = { id: 'w1', user_id: 'uid-1', date: '2026-04-19', weight_kg: 75, created_at: '' }

function makeMockSupabase(upsertResult: { data: typeof MOCK_WEIGHT_ENTRY | null; error: { message: string } | null }) {
  const mockSingle = jest.fn().mockResolvedValue(upsertResult)
  const mockSelect = jest.fn(() => ({ single: mockSingle }))
  const mockUpsert = jest.fn(() => ({ select: mockSelect }))
  const mockChain = {
    upsert: mockUpsert,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: jest.fn(() => mockChain), _mockUpsert: mockUpsert }
}

const DEFAULT_PROPS = {
  calorieData: [],
  workoutData: [],
  weightData: [],
  calorieTarget: 2000,
  targetWeight: 70,
  userId: 'uid-1',
}

beforeEach(() => jest.clearAllMocks())

describe('ProgressClient weight log', () => {
  it('calls upsert with correct payload on save', async () => {
    const mockSupabase = makeMockSupabase({ data: MOCK_WEIGHT_ENTRY, error: null })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(mockSupabase._mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'uid-1', weight_kg: 75 }),
        { onConflict: 'user_id,date' }
      )
    })
  })

  it('disables button while saving', async () => {
    const mockSingle = jest.fn(() => new Promise(() => {})) // never resolves
    const mockSupabase = {
      from: jest.fn(() => ({
        upsert: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) })),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })

  it('shows error message when upsert fails', async () => {
    const mockSupabase = makeMockSupabase({ data: null, error: { message: 'DB error' } })
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ProgressClient {...DEFAULT_PROPS} />)
    await userEvent.type(screen.getByLabelText('Weight (kg)'), '75')
    fireEvent.click(screen.getByRole('button', { name: 'Log weight' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save weight — please try again.')
    })
  })
})
