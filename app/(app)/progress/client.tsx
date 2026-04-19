'use client'
import { useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import CalorieChart from '@/components/progress/calorie-chart'
import WorkoutChart from '@/components/progress/workout-chart'
import WeightChart from '@/components/progress/weight-chart'
import type { CalorieEntry, WorkoutEntry, WeightEntry } from '@/lib/types'

type RangeKey = '1d' | '2d' | '7d' | '30d' | '90d'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1d', label: 'Today' },
  { key: '2d', label: '2d' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
]

function getStartDate(range: RangeKey, today: string): string {
  if (range === '1d') return today
  const daysBack: Record<Exclude<RangeKey, '1d'>, number> = { '2d': 1, '7d': 6, '30d': 29, '90d': 89 }
  const d = new Date(today + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - daysBack[range])
  return d.toISOString().split('T')[0]
}

interface Props {
  calorieData: CalorieEntry[]
  workoutData: WorkoutEntry[]
  weightData: WeightEntry[]
  calorieTarget: number | null
  targetWeight: number | null
  userId: string
}

export default function ProgressClient({
  calorieData: initialCalorieData,
  workoutData: initialWorkoutData,
  weightData: initialWeightData,
  calorieTarget,
  targetWeight,
  userId,
}: Props) {
  const [range, setRange] = useState<RangeKey>('30d')
  const [calorieData, setCalorieData] = useState<CalorieEntry[]>(initialCalorieData)
  const [workoutData, setWorkoutData] = useState<WorkoutEntry[]>(initialWorkoutData)
  const [weightData, setWeightData] = useState<WeightEntry[]>(initialWeightData)
  const [weightInput, setWeightInput] = useState('')
  const [isSavingWeight, setIsSavingWeight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const fetchId = useRef(0)

  const handleRangeChange = async (newRange: RangeKey) => {
    const thisId = ++fetchId.current
    setRange(newRange)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const startDate = getStartDate(newRange, today)

    const [calResult, workoutResult, weightResult] = await Promise.all([
      supabase.from('meal_logs').select('date, calories').eq('user_id', userId).eq('eaten', true).gte('date', startDate).lte('date', today),
      supabase.from('workout_logs').select('date, completed').eq('user_id', userId).gte('date', startDate).lte('date', today),
      supabase.from('weight_entries').select('id, user_id, date, weight_kg, created_at').eq('user_id', userId).gte('date', startDate).lte('date', today).order('date'),
    ])

    if (thisId !== fetchId.current) return

    if (calResult.error !== null || workoutResult.error !== null || weightResult.error !== null) {
      setError('Could not load data — please try again.')
      return
    }

    const calMap = new Map<string, number>()
    for (const row of calResult.data ?? []) {
      calMap.set(row.date, (calMap.get(row.date) ?? 0) + Number(row.calories))
    }
    setCalorieData(
      Array.from(calMap.entries())
        .map(([date, calories]) => ({ date, calories }))
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setWorkoutData((workoutResult.data ?? []).map(r => ({ date: r.date, completed: r.completed })))
    setWeightData(weightResult.data ?? [])
  }

  const handleSaveWeight = async () => {
    const val = Number(weightInput)
    if (!weightInput || isNaN(val) || val <= 0) return
    setIsSavingWeight(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const { data, error: dbError } = await supabase
      .from('weight_entries')
      .upsert({ user_id: userId, date: today, weight_kg: val }, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (dbError !== null) {
      setError('Could not save weight — please try again.')
    } else {
      setWeightData(prev => {
        const filtered = prev.filter(e => e.date !== today)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
      setWeightInput('')
    }
    setIsSavingWeight(false)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">Progress</h1>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 bg-card">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleRangeChange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.1"
          min="0"
          placeholder="e.g. 75.5"
          aria-label="Weight (kg)"
          value={weightInput}
          onChange={e => setWeightInput(e.target.value)}
          className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm font-data focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={handleSaveWeight}
          disabled={isSavingWeight || !weightInput}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSavingWeight ? 'Saving…' : 'Log weight'}
        </button>
        <span className="text-xs text-muted-foreground">kg — today&apos;s entry</span>
      </div>

      <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
        {error ?? ''}
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Calories</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <CalorieChart data={calorieData} target={calorieTarget} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Workouts</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <WorkoutChart data={workoutData} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-widest">Weight</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <WeightChart data={weightData} target={targetWeight} />
        </div>
      </section>
    </div>
  )
}
