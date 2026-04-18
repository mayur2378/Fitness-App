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
  it('returns null for lower boundary (13)', () => expect(validateAge(13)).toBeNull())
  it('returns null for upper boundary (120)', () => expect(validateAge(120)).toBeNull())
  it('returns error for age below 13', () =>
    expect(validateAge(12)).toBe('Age must be between 13 and 120'))
  it('returns error for age above 120', () =>
    expect(validateAge(121)).toBe('Age must be between 13 and 120'))
  it('returns error for zero', () =>
    expect(validateAge(0)).toBe('Age must be between 13 and 120'))
  it('returns error for NaN', () => expect(validateAge(NaN)).toBe('Age is required'))
  it('returns error for negative age', () =>
    expect(validateAge(-5)).toBe('Age must be between 13 and 120'))
})

describe('validateWeight', () => {
  it('returns null for valid weight', () => expect(validateWeight(70)).toBeNull())
  it('returns null for lower boundary (20)', () => expect(validateWeight(20)).toBeNull())
  it('returns null for upper boundary (500)', () => expect(validateWeight(500)).toBeNull())
  it('returns error for weight below 20kg', () =>
    expect(validateWeight(19)).toBe('Weight must be between 20 and 500 kg'))
  it('returns error for weight above 500kg', () =>
    expect(validateWeight(501)).toBe('Weight must be between 20 and 500 kg'))
  it('returns error for NaN', () => expect(validateWeight(NaN)).toBe('Weight is required'))
})

describe('validateHeight', () => {
  it('returns null for valid height', () => expect(validateHeight(170)).toBeNull())
  it('returns null for lower boundary (50)', () => expect(validateHeight(50)).toBeNull())
  it('returns null for upper boundary (300)', () => expect(validateHeight(300)).toBeNull())
  it('returns error for height below 50cm', () =>
    expect(validateHeight(49)).toBe('Height must be between 50 and 300 cm'))
  it('returns error for height above 300cm', () =>
    expect(validateHeight(301)).toBe('Height must be between 50 and 300 cm'))
  it('returns error for NaN', () => expect(validateHeight(NaN)).toBe('Height is required'))
})

describe('validateTargetWeight', () => {
  it('returns null for valid target weight', () => expect(validateTargetWeight(65)).toBeNull())
  it('returns null for lower boundary (20)', () => expect(validateTargetWeight(20)).toBeNull())
  it('returns null for upper boundary (500)', () => expect(validateTargetWeight(500)).toBeNull())
  it('returns error for target below 20kg', () =>
    expect(validateTargetWeight(19)).toBe('Target weight must be between 20 and 500 kg'))
  it('returns error for target above 500kg', () =>
    expect(validateTargetWeight(501)).toBe('Target weight must be between 20 and 500 kg'))
  it('returns error for NaN', () =>
    expect(validateTargetWeight(NaN)).toBe('Target weight is required'))
})

describe('validateWorkoutDays', () => {
  it('returns null for 3 days', () => expect(validateWorkoutDays(3)).toBeNull())
  it('returns null for lower boundary (1)', () => expect(validateWorkoutDays(1)).toBeNull())
  it('returns null for upper boundary (7)', () => expect(validateWorkoutDays(7)).toBeNull())
  it('returns error for 0 days', () =>
    expect(validateWorkoutDays(0)).toBe('Workout days must be a whole number between 1 and 7'))
  it('returns error for 8 days', () =>
    expect(validateWorkoutDays(8)).toBe('Workout days must be a whole number between 1 and 7'))
  it('returns error for fractional days (2.5)', () =>
    expect(validateWorkoutDays(2.5)).toBe('Workout days must be a whole number between 1 and 7'))
  it('returns error for NaN', () =>
    expect(validateWorkoutDays(NaN)).toBe('Workout days is required'))
})

describe('validateCuisine', () => {
  it('returns null for non-empty string', () => expect(validateCuisine('Indian')).toBeNull())
  it('returns error for empty string', () =>
    expect(validateCuisine('')).toBe('Cuisine preference is required'))
  it('returns error for whitespace-only string', () =>
    expect(validateCuisine('   ')).toBe('Cuisine preference is required'))
})
