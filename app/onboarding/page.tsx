'use client'
import { useState } from 'react'
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
  const supabase = createClient()

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
    setStep(prev => prev + 1)
  }

  const handleSubmit = async (stepData: Partial<OnboardingData>) => {
    const fullData = { ...data, ...stepData } as OnboardingData
    setSubmitError(null)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setSubmitError('Session expired — please log in again.')
      return
    }

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      ...fullData,
    })

    if (error) {
      setSubmitError('Could not save your profile. Please try again.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Progress indicator */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground text-center">Step {step} of 4</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 1 && <StepBasicStats onNext={handleNext} defaultValues={data} />}
            {step === 2 && <StepGoal onNext={handleNext} defaultValues={data} />}
            {step === 3 && <StepActivity onNext={handleNext} defaultValues={data} />}
            {step === 4 && <StepCuisine onSubmit={handleSubmit} defaultValues={data} />}
            {submitError && (
              <p role="alert" className="mt-3 text-sm text-destructive text-center">{submitError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
