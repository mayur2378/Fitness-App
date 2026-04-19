import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: '📊' },
  { href: '/meals',     label: 'Meal Plan',   icon: '🥗' },
  { href: '/workouts',  label: 'Workouts',    icon: '🏋️' },
  { href: '/progress',  label: 'Progress',    icon: '📈' },
  { href: '/settings',  label: 'Settings',    icon: '⚙️' },
]

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
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b">
          <span className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">⚡</span> FitAI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-8 max-w-7xl w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
