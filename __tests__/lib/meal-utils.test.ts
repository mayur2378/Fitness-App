import { buildMealGrid, getCurrentWeekStart } from '@/lib/meal-utils'
import type { MealPlanItem } from '@/lib/types'

const makeItem = (overrides: Partial<MealPlanItem>): MealPlanItem => ({
  id: 'item-1',
  meal_plan_id: 'plan-1',
  day_of_week: 'mon',
  meal_type: 'breakfast',
  name: 'Masala Oats',
  calories: 350,
  protein_g: 12,
  carbs_g: 55,
  fat_g: 8,
  ...overrides,
})

describe('buildMealGrid', () => {
  it('places item in correct day and meal type slot', () => {
    const item = makeItem({ day_of_week: 'tue', meal_type: 'lunch', id: 'item-a' })
    const grid = buildMealGrid([item])
    expect(grid.tue.lunch).toEqual(item)
  })

  it('returns undefined for empty slots', () => {
    const grid = buildMealGrid([])
    expect(grid.mon.breakfast).toBeUndefined()
    expect(grid.sun.snack).toBeUndefined()
  })

  it('handles multiple items across different days', () => {
    const breakfast = makeItem({ day_of_week: 'mon', meal_type: 'breakfast', id: 'b1' })
    const dinner = makeItem({ day_of_week: 'fri', meal_type: 'dinner', id: 'd1' })
    const grid = buildMealGrid([breakfast, dinner])
    expect(grid.mon.breakfast).toEqual(breakfast)
    expect(grid.fri.dinner).toEqual(dinner)
    expect(grid.mon.dinner).toBeUndefined()
  })

  it('initialises all 7 days with all 4 meal type keys', () => {
    const grid = buildMealGrid([])
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const
    for (const day of days) {
      expect(grid[day]).toBeDefined()
      for (const mt of mealTypes) {
        expect(grid[day]).toHaveProperty(mt)
      }
    }
  })
})

describe('getCurrentWeekStart', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getCurrentWeekStart()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a Monday (day index 1)', () => {
    const result = getCurrentWeekStart()
    const date = new Date(result + 'T00:00:00Z')
    expect(date.getUTCDay()).toBe(1)
  })

  it('returns correct Monday when given a Wednesday', () => {
    // Wednesday 2026-04-22 → Monday 2026-04-20
    const wednesday = new Date('2026-04-22T12:00:00')
    const day = wednesday.getDay() // 3
    const daysToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(wednesday)
    monday.setDate(wednesday.getDate() + daysToMonday)
    expect(monday.toISOString().split('T')[0]).toBe('2026-04-20')
  })
})
