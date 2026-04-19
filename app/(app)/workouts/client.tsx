'use client'
import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkoutCard from '@/components/workouts/workout-card'
import { Button } from '@/components/ui/button'
import type { WorkoutPlan, WorkoutPlanItem, DayOfWeek, WorkoutLogPayload } from '@/lib/types'

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

interface Props {
  activePlan: WorkoutPlan | null
  items: WorkoutPlanItem[]
  loggedItemIds: string[]
  userId: string
}

export default function WorkoutsClient({ activePlan, items, loggedItemIds, userId }: Props) {
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set(loggedItemIds))
  const [isGenerating, setIsGenerating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isGeneratingRef = useRef(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const itemByDay = Object.fromEntries(items.map(i => [i.day_of_week, i]))

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return
    isGeneratingRef.current = true
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/workouts/generate', { method: 'POST' })
      if (!res.ok) {
        setError('Plan generation failed — try again.')
        return
      }
      router.refresh()
    } finally {
      setIsGenerating(false)
      isGeneratingRef.current = false
    }
  }

  const handleSave = async (payload: WorkoutLogPayload) => {
    setSavingId(payload.workout_plan_item_id)
    setError(null)
    const { error: dbError } = await supabase.from('workout_logs').insert({
      user_id: userId,
      ...payload,
    })
    if (dbError) {
      setError('Could not save log — please try again.')
    } else {
      setLoggedIds(prev => new Set([...prev, payload.workout_plan_item_id]))
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold">Workouts</h1>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
          {isGenerating ? 'Generating…' : activePlan ? 'Regenerate plan' : 'Generate workout plan'}
        </Button>
      </div>

      <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
        {error ?? ''}
      </p>

      {!activePlan ? (
        <p className="text-muted-foreground text-sm">
          No workout plan yet. Click &quot;Generate workout plan&quot; to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {DAYS.map(({ key, label }) => {
            const item = itemByDay[key]
            if (!item) {
              return (
                <div key={key} className="rounded-xl border border-dashed p-4 flex items-center justify-center min-h-[120px] opacity-40">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">Rest</p>
                  </div>
                </div>
              )
            }
            return (
              <WorkoutCard
                key={item.id}
                item={item}
                isLogged={loggedIds.has(item.id)}
                onSave={handleSave}
                isSaving={savingId === item.id}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
