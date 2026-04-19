import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateCalorieTargets } from '@/lib/calorie-utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('sex, age, weight_kg, height_cm, goal, activity_level')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const targets = profile ? calculateCalorieTargets(profile) : null

  const { data: activePlan } = user
    ? await supabase
        .from('meal_plans')
        .select('id, week_start_date')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const today = new Date().toISOString().split('T')[0]
  const { data: todayLogs } = user
    ? await supabase
        .from('meal_logs')
        .select('calories, eaten')
        .eq('user_id', user!.id)
        .eq('date', today)
        .eq('eaten', true)
    : { data: null }

  const caloriesLogged = (todayLogs ?? []).reduce((sum, l) => sum + Number(l.calories), 0)
  const calorieTarget = targets?.daily_calories ?? null
  const pct = calorieTarget ? Math.min(100, Math.round((caloriesLogged / calorieTarget) * 100)) : 0

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Daily budget</p>
          <p className="text-2xl font-data font-bold text-primary">
            {calorieTarget ? `${calorieTarget} kcal` : '—'}
          </p>
          {targets && (
            <p className="text-xs text-muted-foreground">BMI <span className="font-data">{targets.bmi}</span> · {targets.bmi_category}</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Logged today</p>
          <p className="text-2xl font-data font-bold"><span className="font-data">{caloriesLogged}</span> kcal</p>
          <p className="text-xs text-muted-foreground"><span className="font-data">{(todayLogs ?? []).length}</span> meals eaten</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Progress</p>
            <p className="text-xs font-data font-semibold"><span className="font-data">{pct}</span>%</p>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${pct}%`,
                boxShadow: pct > 0 ? '0 0 8px oklch(68% 0.2 40 / 0.4)' : 'none',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {calorieTarget
              ? <><span className="font-data">{Math.max(0, calorieTarget - caloriesLogged)}</span> kcal remaining</>
              : 'No target set'}
          </p>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/meals"
          className="group rounded-xl border border-l-2 border-l-transparent bg-card p-5 hover:border-primary/50 hover:border-l-primary transition-colors space-y-2"
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 6v6l4 2" />
              <circle cx="19" cy="5" r="3" />
            </svg>
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">Meal Plan</p>
              <p className="text-xs text-muted-foreground">
                {activePlan ? `Week of ${activePlan.week_start_date}` : 'No active plan — generate one'}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/workouts"
          className="group rounded-xl border border-l-2 border-l-transparent bg-card p-5 hover:border-primary/50 hover:border-l-primary transition-colors space-y-2"
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <path d="M6 4v16" />
              <path d="M18 4v16" />
              <path d="M6 12h12" />
              <path d="M3 8h3" />
              <path d="M3 16h3" />
              <path d="M18 8h3" />
              <path d="M18 16h3" />
            </svg>
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">Workouts</p>
              <p className="text-xs text-muted-foreground">Coming in a future update</p>
            </div>
          </div>
        </Link>
      </div>

      {targets && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-display font-semibold mb-3">Macro targets</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-data font-bold text-primary"><span className="font-data">{targets.protein_g}</span>g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </div>
            <div>
              <p className="text-xl font-data font-bold" style={{ color: 'oklch(68% 0.18 75)' }}><span className="font-data">{targets.carbs_g}</span>g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </div>
            <div>
              <p className="text-xl font-data font-bold" style={{ color: 'oklch(65% 0.18 20)' }}><span className="font-data">{targets.fat_g}</span>g</p>
              <p className="text-xs text-muted-foreground">Fat</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
