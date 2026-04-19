'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { CalorieEntry } from '@/lib/types'

interface Props {
  data: CalorieEntry[]
  target: number | null
}

export default function CalorieChart({ data, target }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No meals logged in this period
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
          itemStyle={{ color: 'oklch(68% 0.2 40)' }}
          formatter={(v: number) => [`${v} kcal`, 'Calories']}
          labelFormatter={l => `Date: ${l}`}
        />
        {target !== null && (
          <ReferenceLine
            y={target}
            stroke="oklch(68% 0.2 40)"
            strokeDasharray="4 4"
            label={{ value: 'Target', fontSize: 10, fill: 'oklch(68% 0.2 40)', position: 'insideTopRight' }}
          />
        )}
        <Bar dataKey="calories" fill="oklch(68% 0.2 40)" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
