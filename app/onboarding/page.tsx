'use client'
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StepBasicStats from '@/components/onboarding/step-basic-stats'
import StepGoal from '@/components/onboarding/step-goal'
import StepActivity from '@/components/onboarding/step-activity'
import StepCuisine from '@/components/onboarding/step-cuisine'
import { Card, CardContent } from '@/components/ui/card'
import type { OnboardingData } from '@/lib/types'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isSubmitting = useRef(false)

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
    setStep(prev => prev + 1)
  }

  const handleSubmit = async (stepData: Partial<OnboardingData>) => {
    if (isSubmitting.current) return
    isSubmitting.current = true
    setSubmitError(null)
    const fullData = { ...data, ...stepData }
    const requiredKeys = [
      'sex', 'age', 'weight_kg', 'height_cm', 'goal',
      'activity_level', 'experience_level', 'workout_days_per_week',
    ] as const
    const missing = requiredKeys.filter(k => fullData[k] === undefined)
    if (missing.length > 0) {
      isSubmitting.current = false
      setSubmitError('Incomplete profile data. Please restart the wizard.')
      return
    }
    const safeData = fullData as OnboardingData

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      isSubmitting.current = false
      setSubmitError('Session expired — please log in again.')
      return
    }

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      ...safeData,
    })

    if (error) {
      isSubmitting.current = false
      setSubmitError('Could not save your profile. Please try again.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const STEPS = ['Your stats', 'Your goal', 'Activity', 'Food prefs']

  return (
    <div className="min-h-screen grid lg:grid-cols-[280px_1fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div className="flex items-center gap-2 text-xl font-display font-bold">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" /></svg> FitAI
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-primary-foreground/60 text-xs font-semibold uppercase tracking-widest">
              Step {step} of 4
            </p>
            <div className="space-y-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    i + 1 < step
                      ? 'bg-primary-foreground text-primary'
                      : i + 1 === step
                        ? 'bg-primary-foreground/30 text-primary-foreground ring-2 ring-primary-foreground'
                        : 'bg-primary-foreground/10 text-primary-foreground/40'
                  }`}>
                    {i + 1 < step ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1.5,5 3.5,7.5 8.5,2.5" /></svg> : i + 1}
                  </div>
                  <span className={`text-sm ${i + 1 === step ? 'font-semibold' : 'text-primary-foreground/60'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            We&apos;ll use these details to calculate your calorie targets and personalise your meal plans.
          </p>
        </div>
        <p className="text-primary-foreground/40 text-sm">© 2026 FitAI</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile header */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center gap-2 text-xl font-bold">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" /></svg> FitAI
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Step {step} of 4 — {STEPS[step - 1]}</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {step === 1 && <StepBasicStats onNext={handleNext} defaultValues={data} />}
              {step === 2 && <StepGoal onNext={handleNext} defaultValues={data} />}
              {step === 3 && <StepActivity onNext={handleNext} defaultValues={data} />}
              {step === 4 && <StepCuisine onSubmit={handleSubmit} defaultValues={data} />}
            </CardContent>
          </Card>

          <p role="alert" aria-live="assertive" className="text-sm text-destructive text-center min-h-[1.25rem]">
            {submitError ?? ''}
          </p>
        </div>
      </div>
    </div>
  )
}
