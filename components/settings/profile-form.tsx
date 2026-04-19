'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Sex, Goal, ActivityLevel, ExperienceLevel } from '@/lib/types'

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose weight', description: 'Calorie deficit' },
  { value: 'maintain', label: 'Maintain', description: 'Balanced calories' },
  { value: 'gain', label: 'Gain muscle', description: 'Calorie surplus' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
  { value: 'sedentary', label: 'Sedentary', detail: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', detail: '1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately active', detail: '3–5 days/week' },
  { value: 'very_active', label: 'Very active', detail: '6–7 days/week' },
]

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; detail: string }[] = [
  { value: 'beginner', label: 'Beginner', detail: '< 1 year' },
  { value: 'intermediate', label: 'Intermediate', detail: '1–3 years' },
  { value: 'advanced', label: 'Advanced', detail: '3+ years' },
]

interface Props {
  profile: Profile
}

export default function ProfileForm({ profile: initialProfile }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [sex, setSex] = useState<Sex>(initialProfile.sex)
  const [age, setAge] = useState<number | ''>(initialProfile.age)
  const [weightKg, setWeightKg] = useState<number | ''>(initialProfile.weight_kg)
  const [heightCm, setHeightCm] = useState<number | ''>(initialProfile.height_cm)
  const [goal, setGoal] = useState<Goal>(initialProfile.goal)
  const [targetWeight, setTargetWeight] = useState<number | ''>(initialProfile.target_weight_kg ?? '')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activity_level)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(initialProfile.experience_level)
  const [workoutDays, setWorkoutDays] = useState<number | ''>(initialProfile.workout_days_per_week)
  const [cuisine, setCuisine] = useState(initialProfile.cuisine_preference)
  const [restrictions, setRestrictions] = useState(initialProfile.dietary_restrictions.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showRecalculate, setShowRecalculate] = useState(false)
  const [newTargets, setNewTargets] = useState<{ daily_calories: number; bmi: number; bmi_category: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    setShowRecalculate(false)
    setNewTargets(null)

    const goalChanged = goal !== initialProfile.goal
    const weightChanged = Number(weightKg) !== Number(initialProfile.weight_kg)

    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        sex,
        age: Number(age),
        weight_kg: Number(weightKg),
        height_cm: Number(heightCm),
        goal,
        target_weight_kg: targetWeight === '' ? null : Number(targetWeight),
        activity_level: activityLevel,
        experience_level: experienceLevel,
        workout_days_per_week: Number(workoutDays),
        cuisine_preference: cuisine,
        dietary_restrictions: restrictions.split(',').map(s => s.trim()).filter(Boolean),
      })
      .eq('user_id', initialProfile.user_id)

    if (dbError) {
      setError('Could not save profile — please try again.')
      setSaving(false)
      return
    }

    setSuccess(true)
    if (goalChanged || weightChanged) setShowRecalculate(true)
    setSaving(false)
  }

  const handleRecalculate = async () => {
    setShowRecalculate(false)
    const res = await fetch('/api/calorie/calculate', { method: 'POST' })
    if (res.ok) {
      setNewTargets(await res.json())
    } else {
      setError('Could not recalculate targets — please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Biological sex</Label>
        <div className="flex gap-2 pt-1">
          {(['male', 'female'] as Sex[]).map(s => (
            <button key={s} type="button" onClick={() => setSex(s)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold capitalize transition-colors ${
                sex === s ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-muted'
              }`}>
              {s === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'age', label: 'Age', value: age, onChange: (v: number | '') => setAge(v), placeholder: '30', step: '1' },
          { id: 'weight', label: 'Weight (kg)', value: weightKg, onChange: (v: number | '') => setWeightKg(v), placeholder: '70', step: '0.1' },
          { id: 'height', label: 'Height (cm)', value: heightCm, onChange: (v: number | '') => setHeightCm(v), placeholder: '170', step: '0.1' },
        ].map(({ id, label, value, onChange, placeholder, step }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="number" step={step} placeholder={placeholder} className="h-11"
              value={value}
              onChange={e => onChange(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Goal</Label>
        <div className="space-y-2 pt-1">
          {GOALS.map(({ value, label, description }) => (
            <button key={value} type="button" onClick={() => setGoal(value)}
              className={`w-full flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                goal === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
              <div>
                <p className={`text-sm font-semibold ${goal === value ? 'text-primary' : ''}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${goal === value ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target-weight">Target weight (kg)</Label>
        <Input id="target-weight" type="number" step="0.1" placeholder="e.g. 65" className="h-11"
          value={targetWeight}
          onChange={e => setTargetWeight(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {ACTIVITY_OPTIONS.map(({ value, label, detail }) => (
            <button key={value} type="button" onClick={() => setActivityLevel(value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                activityLevel === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
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
            <button key={value} type="button" onClick={() => setExperienceLevel(value)}
              className={`flex-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                experienceLevel === value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/30 hover:bg-muted/40'
              }`}>
              <p className={`text-xs font-semibold ${experienceLevel === value ? 'text-primary' : ''}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout-days">Workout days per week</Label>
        <Input id="workout-days" type="number" min={1} max={7} placeholder="e.g. 4" className="h-11"
          value={workoutDays}
          onChange={e => setWorkoutDays(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cuisine">Cuisine preference</Label>
        <Input id="cuisine" type="text" placeholder="e.g. Indian, Mediterranean" className="h-11"
          value={cuisine} onChange={e => setCuisine(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="restrictions">Dietary restrictions <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="restrictions" type="text" placeholder="e.g. no fish, vegetarian" className="h-11"
          value={restrictions} onChange={e => setRestrictions(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Leave blank if none.</p>
      </div>

      {success && !showRecalculate && !newTargets && (
        <p className="text-sm text-primary">Profile saved.</p>
      )}

      {showRecalculate && (
        <div className="rounded-lg border bg-card border-primary/20 border-l-2 border-l-primary p-3 space-y-2">
          <p className="text-sm font-medium">Your calorie targets may have changed. Recalculate?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleRecalculate}>Yes, recalculate</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowRecalculate(false)}>Skip</Button>
          </div>
        </div>
      )}

      {newTargets && (
        <p className="text-sm text-muted-foreground">
          New target: <strong>{newTargets.daily_calories} kcal/day</strong> · BMI {newTargets.bmi} ({newTargets.bmi_category})
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving} className="w-full h-11">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
