'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateAge, validateWeight, validateHeight } from '@/lib/validation'
import type { OnboardingData, Sex } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'sex' | 'age' | 'weight_kg' | 'height_cm'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepBasicStats({ onNext, defaultValues }: Props) {
  const [sex, setSex] = useState<Sex>(defaultValues.sex ?? 'male')
  const [age, setAge] = useState<number | ''>(defaultValues.age ?? '')
  const [weightKg, setWeightKg] = useState<number | ''>(defaultValues.weight_kg ?? '')
  const [heightCm, setHeightCm] = useState<number | ''>(defaultValues.height_cm ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const ageErr = validateAge(age === '' ? NaN : age)
    const weightErr = validateWeight(weightKg === '' ? NaN : weightKg)
    const heightErr = validateHeight(heightCm === '' ? NaN : heightCm)
    if (ageErr) newErrors.age = ageErr
    if (weightErr) newErrors.weight_kg = weightErr
    if (heightErr) newErrors.height_cm = heightErr
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({ sex, age: Number(age), weight_kg: Number(weightKg), height_cm: Number(heightCm) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Your stats</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Used to calculate your calorie targets</p>
      </div>

      <div className="space-y-1.5">
        <Label>Biological sex</Label>
        <div className="flex gap-2 pt-1">
          {(['male', 'female'] as Sex[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold capitalize transition-colors ${
                sex === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-muted'
              }`}
            >
              {s === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="30"
            className="h-11"
            value={age}
            onChange={e => setAge(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
          />
          {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="70"
            className="h-11"
            value={weightKg}
            onChange={e => setWeightKg(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
          />
          {errors.weight_kg && <p className="text-xs text-destructive">{errors.weight_kg}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            step="0.1"
            placeholder="170"
            className="h-11"
            value={heightCm}
            onChange={e => setHeightCm(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
          />
          {errors.height_cm && <p className="text-xs text-destructive">{errors.height_cm}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full h-11">Continue</Button>
    </form>
  )
}
