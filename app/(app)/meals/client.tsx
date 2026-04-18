'use client'
import React, { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MealCell from '@/components/meals/meal-cell'
import { Button } from '@/components/ui/button'
import { buildMealGrid } from '@/lib/meal-utils'
import type { MealPlan, MealPlanItem, MealType, DayOfWeek } from '@/lib/types'

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

interface Props {
  activePlan: MealPlan | null
  items: MealPlanItem[]
  eatenItemIds: string[]
  userId: string
}

export default function MealsClient({ activePlan, items: initialItems, eatenItemIds, userId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [eatenIds, setEatenIds] = useState<Set<string>>(new Set(eatenItemIds))
  const [isGenerating, setIsGenerating] = useState(false)
  const [swappingId, setSwappingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isGeneratingRef = useRef(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const grid = useMemo(() => buildMealGrid(items), [items])

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return
    isGeneratingRef.current = true
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/meals/generate', { method: 'POST' })
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

  const handleToggleEaten = async (item: MealPlanItem) => {
    const today = new Date().toISOString().split('T')[0]
    const wasEaten = eatenIds.has(item.id)
    setEatenIds(prev => {
      const next = new Set(prev)
      wasEaten ? next.delete(item.id) : next.add(item.id)
      return next
    })
    if (wasEaten) {
      await supabase.from('meal_logs').delete()
        .eq('meal_plan_item_id', item.id).eq('date', today)
    } else {
      await supabase.from('meal_logs').insert({
        user_id: userId, date: today, meal_plan_item_id: item.id,
        name: item.name, calories: item.calories,
        protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
        eaten: true,
      })
    }
  }

  const handleSwap = async (item: MealPlanItem) => {
    setSwappingId(item.id)
    setError(null)
    try {
      const res = await fetch('/api/meals/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      if (!res.ok) {
        setError('No good substitute found — try again.')
        return
      }
      const { substitute } = await res.json()
      await supabase.from('meal_plan_items').update({
        name: substitute.name, calories: substitute.calories,
        protein_g: substitute.protein_g, carbs_g: substitute.carbs_g, fat_g: substitute.fat_g,
      }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...substitute } : i))
    } finally {
      setSwappingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
          {isGenerating ? 'Generating…' : activePlan ? 'Regenerate plan' : 'Generate meal plan'}
        </Button>
      </div>

      <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
        {error ?? ''}
      </p>

      {!activePlan ? (
        <p className="text-muted-foreground text-sm">
          No meal plan yet. Click &quot;Generate meal plan&quot; to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px]" style={{ gridTemplateColumns: '70px repeat(7, 1fr)', gap: '4px' }}>
            <div />
            {DAYS.map(d => (
              <div key={d.key} className="text-center text-xs font-semibold py-1 text-muted-foreground">
                {d.label}
              </div>
            ))}
            {MEAL_TYPES.map(mt => (
              <React.Fragment key={mt}>
                <div className="text-xs font-medium text-muted-foreground capitalize pt-3 pr-1">
                  {mt}
                </div>
                {DAYS.map(d => {
                  const item = grid[d.key]?.[mt as MealType]
                  return (
                    <div key={d.key}>
                      {item ? (
                        <MealCell
                          item={item}
                          isEaten={eatenIds.has(item.id)}
                          onToggleEaten={handleToggleEaten}
                          onSwap={handleSwap}
                          isSwapping={swappingId === item.id}
                        />
                      ) : (
                        <div className="p-2 rounded-lg border border-dashed text-xs text-muted-foreground text-center h-full flex items-center justify-center">
                          —
                        </div>
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
