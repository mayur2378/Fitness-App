import {
  validateAge,
  validateWeight,
  validateHeight,
  validateTargetWeight,
  validateWorkoutDays,
  validateCuisine,
} from '@/lib/validation'

describe('validateAge', () => {
  it('returns null for valid age', () => expect(validateAge(25)).toBeNull())
  it('returns error string for age below 13', () => expect(validateAge(12)).toBeTruthy())
  it('returns error string for age above 120', () => expect(validateAge(121)).toBeTruthy())
  it('returns error string for zero', () => expect(validateAge(0)).toBeTruthy())
})

describe('validateWeight', () => {
  it('returns null for valid weight', () => expect(validateWeight(70)).toBeNull())
  it('returns error for weight below 20kg', () => expect(validateWeight(19)).toBeTruthy())
  it('returns error for weight above 500kg', () => expect(validateWeight(501)).toBeTruthy())
})

describe('validateHeight', () => {
  it('returns null for valid height', () => expect(validateHeight(170)).toBeNull())
  it('returns error for height below 50cm', () => expect(validateHeight(49)).toBeTruthy())
  it('returns error for height above 300cm', () => expect(validateHeight(301)).toBeTruthy())
})

describe('validateTargetWeight', () => {
  it('returns null for valid target weight', () => expect(validateTargetWeight(65)).toBeNull())
  it('returns error for target below 20kg', () => expect(validateTargetWeight(19)).toBeTruthy())
  it('returns error for target above 500kg', () => expect(validateTargetWeight(501)).toBeTruthy())
})

describe('validateWorkoutDays', () => {
  it('returns null for 3 days', () => expect(validateWorkoutDays(3)).toBeNull())
  it('returns null for 1 day', () => expect(validateWorkoutDays(1)).toBeNull())
  it('returns null for 7 days', () => expect(validateWorkoutDays(7)).toBeNull())
  it('returns error for 0 days', () => expect(validateWorkoutDays(0)).toBeTruthy())
  it('returns error for 8 days', () => expect(validateWorkoutDays(8)).toBeTruthy())
})

describe('validateCuisine', () => {
  it('returns null for non-empty string', () => expect(validateCuisine('Indian')).toBeNull())
  it('returns error for empty string', () => expect(validateCuisine('')).toBeTruthy())
  it('returns error for whitespace-only string', () => expect(validateCuisine('   ')).toBeTruthy())
})
