'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { WeightEntry } from '@/lib/types'

interface Props {
  data: WeightEntry[]
  target: number | null
}

export default function WeightChart({ data, target }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No weight entries yet — log your weight above
      </p>
    )
  }

  const chartData = data.map(e => ({ date: e.date, weight: Number(e.weight_kg) }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(20% 0.006 240)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: 'oklch(50% 0.006 240)', fontFamily: 'var(--font-space-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'oklch(12% 0.006 240)', border: '1px solid oklch(20% 0.006 240)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'oklch(96% 0.003 60)' }}
          itemStyle={{ color: 'oklch(68% 0.2 40)' }}
          formatter={(v: unknown) => [`${v ?? 0} kg`, 'Weight']}
          labelFormatter={l => `Date: ${l}`}
        />
        {target !== null && (
          <ReferenceLine
            y={target}
            stroke="oklch(50% 0.006 240)"
            strokeDasharray="4 4"
            label={{ value: 'Target', fontSize: 10, fill: 'oklch(50% 0.006 240)', position: 'insideTopRight' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="oklch(68% 0.2 40)"
          strokeWidth={2}
          dot={{ fill: 'oklch(68% 0.2 40)', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
