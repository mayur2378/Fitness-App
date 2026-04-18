import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) console.error('[AppLayout] auth.getUser error:', authError.message)
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[AppLayout] profile query error:', profileError.message)
    redirect('/login')
  }

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 border-r bg-card p-4 flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted-foreground mb-4">FitAI</p>
        {[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/meals', label: 'Meal Plan' },
          { href: '/workouts', label: 'Workouts' },
          { href: '/progress', label: 'Progress' },
          { href: '/settings', label: 'Settings' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
