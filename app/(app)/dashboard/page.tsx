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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Daily budget</p>
          <p className="text-2xl font-bold text-primary">
            {calorieTarget ? `${calorieTarget} kcal` : '—'}
          </p>
          {targets && (
            <p className="text-xs text-muted-foreground">BMI {targets.bmi} · {targets.bmi_category}</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Logged today</p>
          <p className="text-2xl font-bold">{caloriesLogged} kcal</p>
          <p className="text-xs text-muted-foreground">{(todayLogs ?? []).length} meals eaten</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Progress</p>
            <p className="text-xs font-semibold">{pct}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {calorieTarget
              ? `${Math.max(0, calorieTarget - caloriesLogged)} kcal remaining`
              : 'No target set'}
          </p>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/meals"
          className="group rounded-xl border bg-card p-5 hover:border-primary/50 transition-colors space-y-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥗</span>
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
          className="group rounded-xl border bg-card p-5 hover:border-primary/50 transition-colors space-y-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏋️</span>
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">Workouts</p>
              <p className="text-xs text-muted-foreground">Coming in a future update</p>
            </div>
          </div>
        </Link>
      </div>

      {targets && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Macro targets</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Protein', value: targets.protein_g, color: 'text-blue-500' },
              { label: 'Carbs', value: targets.carbs_g, color: 'text-amber-500' },
              { label: 'Fat', value: targets.fat_g, color: 'text-rose-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className={`text-xl font-bold ${color}`}>{value}g</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
