'use client'
import { useState, useEffect } from 'react'
import type { WorkoutPlanItem, ExerciseLog, WorkoutLogPayload } from '@/lib/types'

interface Props {
  item: WorkoutPlanItem
  isLogged: boolean
  onSave: (payload: WorkoutLogPayload) => void
  isSaving: boolean
}

export default function WorkoutCard({ item, isLogged, onSave, isSaving }: Props) {
  const [mode, setMode] = useState<'view' | 'log'>('view')
  const [actuals, setActuals] = useState<ExerciseLog[]>(
    item.exercises.map(e => ({
      name: e.name,
      actual_sets: e.sets,
      actual_reps: e.reps,
      actual_weight_kg: e.weight_kg,
    }))
  )
  const [notes, setNotes] = useState('')

  const dayLabel = item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setActuals(item.exercises.map(e => ({
      name: e.name,
      actual_sets: e.sets,
      actual_reps: e.reps,
      actual_weight_kg: e.weight_kg,
    })))
    setNotes('')
    setMode('view')
  }, [item.id])

  const handleCancel = () => {
    setActuals(item.exercises.map(e => ({
      name: e.name,
      actual_sets: e.sets,
      actual_reps: e.reps,
      actual_weight_kg: e.weight_kg,
    })))
    setNotes('')
    setMode('view')
  }

  const handleSave = () => {
    onSave({
      workout_plan_item_id: item.id,
      date: new Date().toISOString().split('T')[0],
      completed: true,
      exercises_logged: actuals,
      notes,
    })
  }

  const updateActual = (idx: number, field: keyof ExerciseLog, value: number) => {
    setActuals(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  if (isLogged) {
    return (
      <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
            <p className="font-bold text-sm">{item.name}</p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
            ✓ Completed
          </span>
        </div>
        <ul className="space-y-1">
          {item.exercises.map((e, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{e.name}</span>
              {' · '}{e.sets}×{e.reps} · {e.weight_kg}kg
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayLabel}</p>
        <p className="font-bold text-sm">{item.name}</p>
      </div>

      {mode === 'view' ? (
        <>
          <ul className="space-y-1">
            {item.exercises.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{e.name}</span>
                {' · '}{e.sets}×{e.reps} · {e.weight_kg}kg
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setMode('log')}
            className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:bg-primary/90 transition-colors"
          >
            Log workout
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {actuals.map((e, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-xs font-semibold">{e.name}</p>
                <div className="flex gap-2">
                  {(
                    [
                      { label: 'Sets', field: 'actual_sets' as keyof ExerciseLog },
                      { label: 'Reps', field: 'actual_reps' as keyof ExerciseLog },
                      { label: 'kg', field: 'actual_weight_kg' as keyof ExerciseLog },
                    ] as const
                  ).map(({ label, field }) => (
                    <div key={field} className="flex-1 space-y-0.5">
                      <label
                        htmlFor={`${item.id}-${idx}-${field}`}
                        className="text-[10px] text-muted-foreground block"
                      >
                        {label}
                      </label>
                      <input
                        id={`${item.id}-${idx}-${field}`}
                        type="number"
                        min={0}
                        step={field === 'actual_weight_kg' ? 0.5 : 1}
                        value={e[field] as number}
                        onChange={ev => updateActual(idx, field, Number(ev.target.value))}
                        aria-label={`${e.name} ${label}`}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              aria-label="Workout notes"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 rounded-lg border text-sm font-semibold py-2 hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
