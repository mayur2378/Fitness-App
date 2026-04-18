// lib/validation.ts
export function validateAge(age: number): string | null {
  if (!age || age < 13 || age > 120) return 'Age must be between 13 and 120'
  return null
}

export function validateWeight(weight: number): string | null {
  if (!weight || weight < 20 || weight > 500) return 'Weight must be between 20 and 500 kg'
  return null
}

export function validateHeight(height: number): string | null {
  if (!height || height < 50 || height > 300) return 'Height must be between 50 and 300 cm'
  return null
}

export function validateTargetWeight(target: number): string | null {
  if (!target || target < 20 || target > 500) return 'Target weight must be between 20 and 500 kg'
  return null
}

export function validateWorkoutDays(days: number): string | null {
  if (!days || days < 1 || days > 7) return 'Workout days must be between 1 and 7'
  return null
}

export function validateCuisine(cuisine: string): string | null {
  if (!cuisine || !cuisine.trim()) return 'Cuisine preference is required'
  return null
}
