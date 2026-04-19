'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateCuisine } from '@/lib/validation'
import type { OnboardingData } from '@/lib/types'

interface Props {
  onSubmit: (data: Pick<OnboardingData, 'cuisine_preference' | 'dietary_restrictions'>) => void
  defaultValues: Partial<OnboardingData>
}

export default function StepCuisine({ onSubmit, defaultValues }: Props) {
  const [cuisine, setCuisine] = useState(defaultValues.cuisine_preference ?? '')
  const [restrictions, setRestrictions] = useState(
    (defaultValues.dietary_restrictions ?? []).join(', ')
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const err = validateCuisine(cuisine)
    if (err) newErrors.cuisine_preference = err
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    const dietary_restrictions = restrictions
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    try {
      await onSubmit({ cuisine_preference: cuisine.trim(), dietary_restrictions })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Food preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">We&apos;ll tailor your meal plans to these</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cuisine">Cuisine preference</Label>
        <Input
          id="cuisine"
          type="text"
          placeholder="e.g. Indian, Mediterranean, Asian"
          className="h-11"
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
        />
        {errors.cuisine_preference && (
          <p className="text-sm text-destructive">{errors.cuisine_preference}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="restrictions">Dietary restrictions <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="restrictions"
          type="text"
          placeholder="e.g. no fish, vegetarian, no pork"
          className="h-11"
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Leave blank if none.</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-11">
        {loading ? 'Creating your profile…' : 'Finish setup'}
      </Button>
    </form>
  )
}
