'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WorkoutEntry } from '@/lib/types'

interface Props {
  data: WorkoutEntry[]
}

interface DayEntry {
  date: string
  completed: number
  missed: number
}

export default function WorkoutChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No workouts logged in this period
      </p>
    )
  }

  const byDate = new Map<string, DayEntry>()
  for (const entry of data) {
    const existing = byDate.get(entry.date) ?? { date: entry.date, completed: 0, missed: 0 }
    if (entry.completed) existing.completed++
    else existing.missed++
    byDate.set(entry.date, existing)
  }
  const chartData = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
        />
        <Bar dataKey="completed" name="Completed" fill="oklch(68% 0.2 40)" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
        <Bar dataKey="missed" name="Missed" fill="oklch(30% 0.006 240)" radius={[3, 3, 0, 0]} maxBarSize={40} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}
