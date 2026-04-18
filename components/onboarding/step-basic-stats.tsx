'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateAge, validateWeight, validateHeight } from '@/lib/validation'
import type { OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'age' | 'weight_kg' | 'height_cm'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepBasicStats({ onNext, defaultValues }: Props) {
  const [age, setAge] = useState<number | ''>(defaultValues.age ?? '')
  const [weightKg, setWeightKg] = useState<number | ''>(defaultValues.weight_kg ?? '')
  const [heightCm, setHeightCm] = useState<number | ''>(defaultValues.height_cm ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const ageErr = validateAge(Number(age))
    const weightErr = validateWeight(Number(weightKg))
    const heightErr = validateHeight(Number(heightCm))
    if (ageErr) newErrors.age = ageErr
    if (weightErr) newErrors.weight_kg = weightErr
    if (heightErr) newErrors.height_cm = heightErr
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({ age: Number(age), weight_kg: Number(weightKg), height_cm: Number(heightCm) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Your stats</h2>
      <div className="space-y-1">
        <Label htmlFor="age">Age (years)</Label>
        <Input
          id="age"
          type="number"
          value={age}
          onChange={e => {
            const val = e.target.valueAsNumber
            setAge(isNaN(val) ? '' : val)
          }}
        />
        {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="weight">Weight (kg)</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          value={weightKg}
          onChange={e => {
            const val = e.target.valueAsNumber
            setWeightKg(isNaN(val) ? '' : val)
          }}
        />
        {errors.weight_kg && <p className="text-sm text-destructive">{errors.weight_kg}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="height">Height (cm)</Label>
        <Input
          id="height"
          type="number"
          step="0.1"
          value={heightCm}
          onChange={e => {
            const val = e.target.valueAsNumber
            setHeightCm(isNaN(val) ? '' : val)
          }}
        />
        {errors.height_cm && <p className="text-sm text-destructive">{errors.height_cm}</p>}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
