'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('Could not create account. Please try again.')
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[5fr_7fr]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" />
          </svg>
          FitAI
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold leading-tight">
            Start your transformation today
          </h1>
          <ul className="space-y-2 text-primary-foreground/80">
            {[
              'AI-generated 7-day meal plans',
              'Personalised calorie targets from your BMI',
              'Automatic weekly plan adjustments',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                  <polyline points="2,7 5.5,10.5 12,3.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-primary-foreground/50 text-sm">© 2026 FitAI</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xl font-bold lg:hidden mb-6">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" />
              </svg>
              FitAI
            </div>
            <h2 className="text-2xl font-display font-bold">Create your account</h2>
            <p className="text-muted-foreground text-sm">Free to use. No credit card required.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="6+ characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-11"
              />
            </div>
            <p role="alert" aria-live="assertive" className="text-sm text-destructive min-h-[1.25rem]">
              {error ?? ''}
            </p>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
