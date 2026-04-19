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

  const GOALS: { value: Goal; label: string; description: string; icon: string }[] = [
    { value: 'lose', label: 'Lose weight', description: 'Calorie deficit + meal plans', icon: '🔥' },
    { value: 'maintain', label: 'Maintain', description: 'Balanced calorie target', icon: '⚖️' },
    { value: 'gain', label: 'Gain muscle', description: 'Calorie surplus for growth', icon: '💪' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Your goal</h2>
        <p className="text-sm text-muted-foreground mt-0.5">This shapes your calorie deficit or surplus</p>
      </div>

      <div className="space-y-2">
        {GOALS.map(({ value, label, description, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setGoal(value)}
            className={`w-full flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
              goal === value
                ? 'border-primary bg-primary/5'
                : 'border-input hover:border-primary/30 hover:bg-muted/40'
            }`}
          >
            <span className="text-2xl shrink-0">{icon}</span>
            <div>
              <p className={`text-sm font-semibold ${goal === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
              goal === value ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`} />
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target-weight">Target weight (kg)</Label>
        <Input
          id="target-weight"
          type="number"
          step="0.1"
          placeholder="e.g. 65"
          className="h-11"
          value={targetWeight}
          onChange={e => setTargetWeight(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
        {errors.target_weight_kg && <p className="text-sm text-destructive">{errors.target_weight_kg}</p>}
      </div>

      <Button type="submit" className="w-full h-11">Continue</Button>
    </form>
  )
}
