'use client'

import { useState } from 'react'
import type { HistoryWeek, MealPlanItem, WorkoutPlanItem } from '@/lib/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function formatWeekRange(weekStart: string): string {
  // Parse as UTC to avoid timezone shifts
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(Date.UTC(y, m - 1, d + 6))
  const sm = MONTH_ABBR[start.getUTCMonth()]
  const sd = start.getUTCDate()
  const em = MONTH_ABBR[end.getUTCMonth()]
  const ed = end.getUTCDate()
  if (sm === em) return `${sm} ${sd} – ${ed}`
  return `${sm} ${sd} – ${em} ${ed}`
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface MealCardProps {
  planId: string
  items: MealPlanItem[]
  weekStart: string
}

interface WorkoutCardProps {
  planId: string
  items: WorkoutPlanItem[]
  weekStart: string
}

function MealPlanCard({ planId, items, weekStart }: MealCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleReactivate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/history/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meal', planId, weekStart }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Reactivation failed')
      } else {
        setDone(true)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-display font-semibold text-foreground">Meal Plan</h3>

      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide w-8 shrink-0">
              {DAY_LABELS[item.day_of_week]}
            </span>
            <span className="flex-1 text-foreground truncate">{item.name}</span>
            <span className="font-data text-muted-foreground shrink-0">{item.calories} kcal</span>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleReactivate}
        disabled={loading || done}
        className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {done ? 'Activated!' : loading ? 'Re-activating…' : 'Re-activate'}
      </button>
    </div>
  )
}

function WorkoutPlanCard({ planId, items, weekStart }: WorkoutCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleReactivate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/history/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'workout', planId, weekStart }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Reactivation failed')
      } else {
        setDone(true)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-display font-semibold text-foreground">Workout Plan</h3>

      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-baseline gap-2 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide w-8 shrink-0">
              {DAY_LABELS[item.day_of_week]}
            </span>
            <span className="flex-1 text-foreground truncate">{item.name}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleReactivate}
        disabled={loading || done}
        className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {done ? 'Activated!' : loading ? 'Re-activating…' : 'Re-activate'}
      </button>
    </div>
  )
}

// ─── week row ─────────────────────────────────────────────────────────────────

function WeekRow({ week }: { week: HistoryWeek }) {
  const [open, setOpen] = useState(false)
  const label = formatWeekRange(week.weekStart)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* header toggle */}
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors group"
      >
        <span className="font-display font-semibold text-sm text-foreground">{label}</span>
        <span
          className="text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180"
          aria-hidden="true"
        >
          <ChevronIcon />
        </span>
      </button>

      {/* expandable body */}
      {open && (
        <div className="border-t border-border px-5 py-4">
          {!week.mealPlan && !week.workoutPlan ? (
            <p className="text-xs text-muted-foreground">No plan data for this week.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {week.mealPlan && (
                <MealPlanCard
                  planId={week.mealPlan.id}
                  items={week.mealPlan.items}
                  weekStart={week.weekStart}
                />
              )}
              {week.workoutPlan && (
                <WorkoutPlanCard
                  planId={week.workoutPlan.id}
                  items={week.workoutPlan.items}
                  weekStart={week.weekStart}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function HistoryClient({
  weeks,
  userId: _userId,
}: {
  weeks: HistoryWeek[]
  userId: string
}) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">History</h1>
        <span className="text-xs text-muted-foreground font-data">
          {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'} archived
        </span>
      </div>

      {/* empty state */}
      {weeks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
          <p className="text-muted-foreground text-sm font-medium">
            No past plans yet — your history will appear here once a week rolls over.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {weeks.map(week => (
            <WeekRow key={week.weekStart} week={week} />
          ))}
        </div>
      )}
    </div>
  )
}
