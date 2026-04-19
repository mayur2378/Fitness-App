import React from 'react'
import { render, screen } from '@testing-library/react'
import CalorieChart from '@/components/progress/calorie-chart'
import type { CalorieEntry } from '@/lib/types'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  CartesianGrid: () => null,
}))

const SAMPLE: CalorieEntry[] = [
  { date: '2026-04-17', calories: 1800 },
  { date: '2026-04-18', calories: 2100 },
]

describe('CalorieChart', () => {
  it('renders empty state when no data', () => {
    render(<CalorieChart data={[]} target={2000} />)
    expect(screen.getByText('No meals logged in this period')).toBeInTheDocument()
  })

  it('renders bar chart when data is provided', () => {
    render(<CalorieChart data={SAMPLE} target={2000} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders without crashing when target is null', () => {
    render(<CalorieChart data={SAMPLE} target={null} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
