import React from 'react'
import { render, screen } from '@testing-library/react'
import WorkoutChart from '@/components/progress/workout-chart'
import type { WorkoutEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: WorkoutEntry[] = [
  { date: '2026-04-17', completed: true },
  { date: '2026-04-18', completed: false },
  { date: '2026-04-17', completed: true },
]

describe('WorkoutChart', () => {
  it('renders empty state when no data', () => {
    render(<WorkoutChart data={[]} />)
    expect(screen.getByText('No workouts logged in this period')).toBeInTheDocument()
  })

  it('renders bar chart when data is provided', () => {
    render(<WorkoutChart data={SAMPLE} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
