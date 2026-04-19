'use client'
import type { MealPlanItem } from '@/lib/types'

interface Props {
  item: MealPlanItem
  isEaten: boolean
  onToggleEaten: (item: MealPlanItem) => void
  onSwap: (item: MealPlanItem) => void
  isSwapping: boolean
}

export default function MealCell({ item, isEaten, onToggleEaten, onSwap, isSwapping }: Props) {
  return (
    <div className={`rounded-lg border p-2.5 space-y-2 transition-colors ${isEaten ? 'bg-muted/60 border-muted' : 'bg-card hover:border-primary/30'}`}>
      <p className={`text-xs font-semibold leading-snug ${isEaten ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {item.name}
      </p>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold font-data ${isEaten ? 'text-muted-foreground' : 'text-primary'}`}>
          {item.calories} kcal
        </span>
      </div>

      <div className="flex gap-1 flex-wrap">
        {[
          { label: 'P', value: item.protein_g },
          { label: 'C', value: item.carbs_g },
          { label: 'F', value: item.fat_g },
        ].map(({ label, value }) => (
          <span key={label} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className={`font-bold ${isEaten ? '' : 'text-primary'}`}>{label}</span>{value}g
          </span>
        ))}
      </div>

      <div className="flex gap-1 pt-0.5">
        <button
          type="button"
          aria-label={isEaten ? 'Mark as not eaten' : 'Mark as eaten'}
          onClick={() => onToggleEaten(item)}
          className={`flex-1 rounded text-[10px] font-semibold py-1 transition-colors ${
            isEaten
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          {isEaten ? '✓ Eaten' : 'Log meal'}
        </button>
        <button
          type="button"
          aria-label="Swap meal"
          onClick={() => onSwap(item)}
          disabled={isSwapping}
          className="rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40"
        >
          {isSwapping ? '…' : '⇄'}
        </button>
      </div>
    </div>
  )
}
