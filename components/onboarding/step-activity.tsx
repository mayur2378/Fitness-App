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
    const err = validateWorkoutDays(Number(workoutDays))
    if (err) newErrors.workout_days_per_week = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({
      activity_level: activityLevel,
      experience_level: experienceLevel,
      workout_days_per_week: Number(workoutDays),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Activity &amp; experience</h2>
      <div className="space-y-1">
        <Label htmlFor="activity">Activity level</Label>
        <select
          id="activity"
          value={activityLevel}
          onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="sedentary">Sedentary (little or no exercise)</option>
          <option value="lightly_active">Lightly active (1–3 days/week)</option>
          <option value="moderately_active">Moderately active (3–5 days/week)</option>
          <option value="very_active">Very active (6–7 days/week)</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="experience">Fitness experience</Label>
        <select
          id="experience"
          value={experienceLevel}
          onChange={e => setExperienceLevel(e.target.value as ExperienceLevel)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="beginner">Beginner (&lt; 1 year)</option>
          <option value="intermediate">Intermediate (1–3 years)</option>
          <option value="advanced">Advanced (3+ years)</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="workout-days">Workout days per week</Label>
        <Input
          id="workout-days"
          type="number"
          min={1}
          max={7}
          value={workoutDays}
          onChange={e => {
            const val = e.target.valueAsNumber
            setWorkoutDays(isNaN(val) ? '' : val)
          }}
        />
        {errors.workout_days_per_week && (
          <p className="text-sm text-destructive">{errors.workout_days_per_week}</p>
        )}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
