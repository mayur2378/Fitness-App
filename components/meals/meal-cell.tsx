'use client'
import { Button } from '@/components/ui/button'
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
    <div className={`p-3 rounded-lg border text-sm space-y-1 ${isEaten ? 'bg-muted' : 'bg-card'}`}>
      <p className={`font-medium leading-tight text-xs ${isEaten ? 'line-through text-muted-foreground' : ''}`}>
        {item.name}
      </p>
      <p className="text-muted-foreground text-xs">{item.calories} kcal</p>
      <p className="text-muted-foreground text-xs">
        P: {item.protein_g}g · C: {item.carbs_g}g · F: {item.fat_g}g
      </p>
      <div className="flex gap-1 pt-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          aria-label={isEaten ? 'Mark as not eaten' : 'Mark as eaten'}
          onClick={() => onToggleEaten(item)}
        >
          {isEaten ? '✓ Eaten' : 'Eaten?'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          aria-label="Swap meal"
          onClick={() => onSwap(item)}
          disabled={isSwapping}
        >
          {isSwapping ? '…' : 'Swap'}
        </Button>
      </div>
    </div>
  )
}
