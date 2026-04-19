'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateWorkoutDays } from '@/lib/validation'
import type { ActivityLevel, ExperienceLevel, OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'activity_level' | 'experience_level' | 'workout_days_per_week'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepActivity({ onNext, defaultValues }: Props) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    defaultValues.activity_level ?? 'moderately_active'
  )
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    defaultValues.experience_level ?? 'beginner'
  )
  const [workoutDays, setWorkoutDays] = useState<number | ''>(
    defaultValues.workout_days_per_week ?? ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateWorkoutDays(workoutDays === '' ? NaN : workoutDays)
    if (err) newErrors.workout_days_per_week = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({
      activity_level: activityLevel,
      experience_level: experienceLevel,
      workout_days_per_week: Number(workoutDays),
    })
  }

  const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
    { value: 'sedentary', label: 'Sedentary', detail: 'Little or no exercise' },
    { value: 'lightly_active', label: 'Lightly active', detail: '1–3 days / week' },
    { value: 'moderately_active', label: 'Moderately active', detail: '3–5 days / week' },
    { value: 'very_active', label: 'Very active', detail: '6–7 days / week' },
  ]

  const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; detail: string }[] = [
    { value: 'beginner', label: 'Beginner', detail: 'Less than 1 year' },
    { value: 'intermediate', label: 'Intermediate', detail: '1–3 years' },
    { value: 'advanced', label: 'Advanced', detail: '3+ years' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Activity &amp; experience</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Helps us calibrate your calorie burn</p>
      </div>

      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {ACTIVITY_OPTIONS.map(({ value, label, detail }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActivityLevel(value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                activityLevel === value
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}
            >
              <p className={`text-xs font-semibold ${activityLevel === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Fitness experience</Label>
        <div className="flex gap-2 pt-1">
          {EXPERIENCE_OPTIONS.map(({ value, label, detail }) => (
            <button
              key={value}
              type="button"
              onClick={() => setExperienceLevel(value)}
              className={`flex-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                experienceLevel === value
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}
            >
              <p className={`text-xs font-semibold ${experienceLevel === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout-days">Workout days per week</Label>
        <Input
          id="workout-days"
          type="number"
          min={1}
          max={7}
          placeholder="e.g. 4"
          className="h-11"
          value={workoutDays}
          onChange={e => setWorkoutDays(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
        {errors.workout_days_per_week && (
          <p className="text-sm text-destructive">{errors.workout_days_per_week}</p>
        )}
      </div>

      <Button type="submit" className="w-full h-11">Continue</Button>
    </form>
  )
}
