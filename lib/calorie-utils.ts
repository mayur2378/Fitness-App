import type { CalorieTargets } from '@/lib/types'

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
}

export function calculateBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100
  return weight_kg / (height_m * height_m)
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

function deficitForGoal(goal: string, bmi: number): number {
  if (goal === 'gain') return 300
  if (goal === 'maintain') return 0
  // lose — scale deficit to how much there is to lose
  if (bmi < 25) return -300
  if (bmi < 30) return -500
  return -750
}

const MIN_CALORIES: Record<string, number> = { male: 1500, female: 1200 }

export function calculateCalorieTargets(profile: {
  sex: string
  age: number
  weight_kg: number | string
  height_cm: number | string
  goal: string
  activity_level: string
}): CalorieTargets & { bmi: number; bmi_category: string } {
  const w = Number(profile.weight_kg)
  const h = Number(profile.height_cm)
  const bmi = calculateBMI(w, h)

  // Mifflin-St Jeor — sex-aware
  const bmr = profile.sex === 'female'
    ? 10 * w + 6.25 * h - 5 * profile.age - 161
    : 10 * w + 6.25 * h - 5 * profile.age + 5

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[profile.activity_level] ?? 1.4)
  const raw = Math.round(tdee + deficitForGoal(profile.goal, bmi))
  const floor = MIN_CALORIES[profile.sex] ?? 1200
  const daily_calories = Math.max(raw, floor)

  const protein_g = Math.round(w * 2)
  const fat_g = Math.round((daily_calories * 0.25) / 9)
  const carbs_g = Math.round((daily_calories - protein_g * 4 - fat_g * 9) / 4)

  return { daily_calories, protein_g, carbs_g, fat_g, bmi: Math.round(bmi * 10) / 10, bmi_category: bmiCategory(bmi) }
}
