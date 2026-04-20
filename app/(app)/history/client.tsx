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
  reactivating: string | null
  onReactivate: (type: 'meal' | 'workout', planId: string, weekStart: string) => Promise<void>
}

interface WorkoutCardProps {
  planId: string
  items: WorkoutPlanItem[]
  weekStart: string
  reactivating: string | null
  onReactivate: (type: 'meal' | 'workout', planId: string, weekStart: string) => Promise<void>
}

function MealPlanCard({ planId, items, weekStart, reactivating, onReactivate }: MealCardProps) {
  const isLoading = reactivating === planId

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

      <button
        type="button"
        onClick={() => onReactivate('meal', planId, weekStart)}
        disabled={isLoading}
        className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Re-activating…' : 'Re-activate'}
      </button>
    </div>
  )
}

function WorkoutPlanCard({ planId, items, weekStart, reactivating, onReactivate }: WorkoutCardProps) {
  const isLoading = reactivating === planId

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

      <button
        type="button"
        onClick={() => onReactivate('workout', planId, weekStart)}
        disabled={isLoading}
        className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Re-activating…' : 'Re-activate'}
      </button>
    </div>
  )
}

// ─── week row ─────────────────────────────────────────────────────────────────

interface WeekRowProps {
  week: HistoryWeek
  expanded: boolean
  onToggle: (weekStart: string) => void
  reactivating: string | null
  onReactivate: (type: 'meal' | 'workout', planId: string, weekStart: string) => Promise<void>
}

function WeekRow({ week, expanded, onToggle, reactivating, onReactivate }: WeekRowProps) {
  const label = formatWeekRange(week.weekStart)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* header toggle */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => onToggle(week.weekStart)}
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
      {expanded && (
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
                  reactivating={reactivating}
                  onReactivate={onReactivate}
                />
              )}
              {week.workoutPlan && (
                <WorkoutPlanCard
                  planId={week.workoutPlan.id}
                  items={week.workoutPlan.items}
                  weekStart={week.weekStart}
                  reactivating={reactivating}
                  onReactivate={onReactivate}
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
  weeks: initialWeeks,
  userId: _userId,
}: {
  weeks: HistoryWeek[]
  userId: string
}) {
  const [weeks, setWeeks] = useState<HistoryWeek[]>(initialWeeks)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (weekStart: string) => {
    setExpandedWeek(prev => (prev === weekStart ? null : weekStart))
  }

  const handleReactivate = async (type: 'meal' | 'workout', planId: string, weekStart: string) => {
    setReactivating(planId)
    setError(null)
    try {
      const res = await fetch('/api/history/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, planId, weekStart }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Reactivation failed')
      } else {
        setWeeks(prev =>
          prev
            .map(w => {
              if (w.weekStart !== weekStart) return w
              if (type === 'meal') return { ...w, mealPlan: undefined }
              return { ...w, workoutPlan: undefined }
            })
            .filter(w => w.mealPlan !== undefined || w.workoutPlan !== undefined)
        )
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setReactivating(null)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">History</h1>
        <span className="text-xs text-muted-foreground font-data">
          {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'} archived
        </span>
      </div>

      {/* error banner */}
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
            <WeekRow
              key={week.weekStart}
              week={week}
              expanded={expandedWeek === week.weekStart}
              onToggle={handleToggle}
              reactivating={reactivating}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
