import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/settings/profile-form'
import SecurityForm from '@/components/settings/security-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  return (
    <div className="max-w-xl space-y-10">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and account</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-display font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to personalise your meal and workout plans
          </p>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <div className="border-t border-border" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-display font-semibold">Security</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Update your login credentials</p>
        </div>
        <SecurityForm currentEmail={user.email ?? ''} />
      </section>
    </div>
  )
}
