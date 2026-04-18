'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateTargetWeight } from '@/lib/validation'
import type { Goal, OnboardingData } from '@/lib/types'

interface Props {
  onNext: (data: Pick<OnboardingData, 'goal' | 'target_weight_kg'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepGoal({ onNext, defaultValues }: Props) {
  const [goal, setGoal] = useState<Goal>(defaultValues.goal ?? 'lose')
  const [targetWeight, setTargetWeight] = useState<number | ''>(defaultValues.target_weight_kg ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateTargetWeight(targetWeight === '' ? NaN : targetWeight)
    if (err) newErrors.target_weight_kg = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    onNext({ goal, target_weight_kg: Number(targetWeight) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Your goal</h2>
      <div className="space-y-1">
        <Label htmlFor="goal">Goal</Label>
        <select
          id="goal"
          value={goal}
          onChange={e => setGoal(e.target.value as Goal)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="lose">Lose weight</option>
          <option value="gain">Gain muscle</option>
          <option value="maintain">Maintain / general health</option>
        </select>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">How much do you want to weigh? (kg)</p>
        <Input
          id="target-weight"
          type="number"
          step="0.1"
          aria-label="Target weight (kg)"
          value={targetWeight}
          onChange={e => {
            const val = e.target.valueAsNumber
            setTargetWeight(isNaN(val) ? '' : val)
          }}
        />
        {errors.target_weight_kg && <p className="text-sm text-destructive">{errors.target_weight_kg}</p>}
      </div>
      <Button type="submit" className="w-full">Next</Button>
    </form>
  )
}
