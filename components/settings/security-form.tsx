'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentEmail: string
}

export default function SecurityForm({ currentEmail }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError(null)
    setEmailSuccess(false)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSuccess(true)
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Email address</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Current: <span>{currentEmail}</span></p>
        </div>
        <form onSubmit={handleEmailUpdate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="new@example.com"
              className="h-11 max-w-sm"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {emailSuccess && <p className="text-sm text-green-600">Email updated — check your inbox to confirm.</p>}
          {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          <Button type="submit" disabled={emailLoading} size="sm">
            {emailLoading ? 'Updating…' : 'Update email'}
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Password</h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="8+ characters"
              className="h-11 max-w-sm"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              className="h-11 max-w-sm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {passwordSuccess && <p className="text-sm text-green-600">Password updated successfully.</p>}
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button type="submit" disabled={passwordLoading} size="sm">
            {passwordLoading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
