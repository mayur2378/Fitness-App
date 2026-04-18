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

    await onSubmit({ cuisine_preference: cuisine.trim(), dietary_restrictions })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Food preferences</h2>
      <div className="space-y-1">
        <Label htmlFor="cuisine">Cuisine preference</Label>
        <Input
          id="cuisine"
          type="text"
          placeholder="e.g. Indian, Mediterranean"
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
        />
        {errors.cuisine_preference && (
          <p className="text-sm text-destructive">{errors.cuisine_preference}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="restrictions">Dietary restrictions (comma-separated, optional)</Label>
        <Input
          id="restrictions"
          type="text"
          placeholder="e.g. no fish, no pork"
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Leave blank if none</p>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Setting up your plan…' : 'Finish setup'}
      </Button>
    </form>
  )
}
