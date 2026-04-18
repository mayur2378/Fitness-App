// lib/types.ts
export type Goal = 'lose' | 'gain' | 'maintain'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Profile {
  id: string
  user_id: string
  age: number
  weight_kg: number
  height_cm: number
  goal: Goal
  target_weight_kg: number
  activity_level: ActivityLevel
  experience_level: ExperienceLevel
  workout_days_per_week: number
  cuisine_preference: string
  dietary_restrictions: string[]
  created_at: string
  updated_at: string
}

export interface OnboardingData {
  age: number
  weight_kg: number
  height_cm: number
  goal: Goal
  target_weight_kg: number
  activity_level: ActivityLevel
  experience_level: ExperienceLevel
  workout_days_per_week: number
  cuisine_preference: string
  dietary_restrictions: string[]
}
