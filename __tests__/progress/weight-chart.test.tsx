import React from 'react'
import { render, screen } from '@testing-library/react'
import WeightChart from '@/components/progress/weight-chart'
import type { WeightEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: WeightEntry[] = [
  { id: 'w1', user_id: 'u1', date: '2026-04-17', weight_kg: 78, created_at: '' },
  { id: 'w2', user_id: 'u1', date: '2026-04-18', weight_kg: 77.5, created_at: '' },
]

describe('WeightChart', () => {
  it('renders empty state when no data', () => {
    render(<WeightChart data={[]} target={null} />)
    expect(screen.getByText('No weight entries yet — log your weight above')).toBeInTheDocument()
  })

  it('renders line chart when data is provided', () => {
    render(<WeightChart data={SAMPLE} target={75} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders without crashing when target is null', () => {
    render(<WeightChart data={SAMPLE} target={null} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
