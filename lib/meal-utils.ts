import type { DayOfWeek, MealType, MealPlanItem } from '@/lib/types'

export type MealGrid = Record<DayOfWeek, Record<MealType, MealPlanItem | undefined>>

const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export function buildMealGrid(items: MealPlanItem[]): MealGrid {
  const grid = {} as MealGrid
  for (const day of DAYS) {
    grid[day] = {} as Record<MealType, MealPlanItem | undefined>
    for (const mt of MEAL_TYPES) {
      grid[day][mt] = items.find(i => i.day_of_week === day && i.meal_type === mt)
    }
  }
  return grid
}

export function getCurrentWeekStart(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysToMonday)
  return monday.toISOString().split('T')[0]
}
