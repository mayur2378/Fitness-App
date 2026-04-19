// lib/types.ts
export type Goal = 'lose' | 'gain' | 'maintain'
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type PlanStatus = 'proposed' | 'active' | 'archived'

export interface Profile {
  id: string
  user_id: string
  sex: Sex
  age: number
  weight_kg: number
  height_cm: number
  goal: Goal
  target_weight_kg?: number
  activity_level: ActivityLevel
  experience_level: ExperienceLevel
  workout_days_per_week: number
  cuisine_preference: string
  dietary_restrictions: string[]
  created_at: string
  updated_at: string
}

export type OnboardingData = Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface CalorieTargets {
  daily_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MealPlan {
  id: string
  user_id: string
  week_start_date: string
  status: PlanStatus
  created_at: string
}

export interface MealPlanItem {
  id: string
  meal_plan_id: string
  day_of_week: DayOfWeek
  meal_type: MealType
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_plan_item_id: string | null
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  eaten: boolean
  created_at: string
}

export interface WorkoutPlan {
  id: string
  user_id: string
  week_start_date: string
  status: PlanStatus
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  weight_kg: number
}

export interface WorkoutPlanItem {
  id: string
  workout_plan_id: string
  day_of_week: DayOfWeek
  name: string
  exercises: Exercise[]
}

export interface ExerciseLog {
  name: string
  actual_sets: number
  actual_reps: number
  actual_weight_kg: number
}

export interface WorkoutLog {
  id: string
  user_id: string
  date: string
  workout_plan_item_id: string | null
  completed: boolean
  exercises_logged: ExerciseLog[]
  notes: string | null
  created_at: string
}

export interface WorkoutLogPayload {
  workout_plan_item_id: string
  date: string
  completed: boolean
  exercises_logged: ExerciseLog[]
  notes: string
}
