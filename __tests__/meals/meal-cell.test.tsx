import { render, screen, fireEvent } from '@testing-library/react'
import MealCell from '@/components/meals/meal-cell'
import type { MealPlanItem } from '@/lib/types'

const mockItem: MealPlanItem = {
  id: 'item-1',
  meal_plan_id: 'plan-1',
  day_of_week: 'mon',
  meal_type: 'breakfast',
  name: 'Masala Oats',
  calories: 350,
  protein_g: 12,
  carbs_g: 55,
  fat_g: 8,
}

describe('MealCell', () => {
  it('renders meal name and calories', () => {
    render(<MealCell item={mockItem} isEaten={false} onToggleEaten={jest.fn()} onSwap={jest.fn()} isSwapping={false} />)
    expect(screen.getByText('Masala Oats')).toBeInTheDocument()
    expect(screen.getByText(/350/)).toBeInTheDocument()
  })

  it('renders macro values', () => {
    render(<MealCell item={mockItem} isEaten={false} onToggleEaten={jest.fn()} onSwap={jest.fn()} isSwapping={false} />)
    expect(screen.getByText('P: 12g · C: 55g · F: 8g')).toBeInTheDocument()
  })

  it('calls onToggleEaten with the item when eaten button clicked', () => {
    const mockToggle = jest.fn()
    render(<MealCell item={mockItem} isEaten={false} onToggleEaten={mockToggle} onSwap={jest.fn()} isSwapping={false} />)
    fireEvent.click(screen.getByRole('button', { name: /mark as eaten/i }))
    expect(mockToggle).toHaveBeenCalledWith(mockItem)
  })

  it('shows unmark button and line-through when isEaten is true', () => {
    render(<MealCell item={mockItem} isEaten={true} onToggleEaten={jest.fn()} onSwap={jest.fn()} isSwapping={false} />)
    expect(screen.getByRole('button', { name: /mark as not eaten/i })).toBeInTheDocument()
    expect(screen.getByText('Masala Oats')).toHaveClass('line-through')
  })

  it('calls onSwap with the item when swap button clicked', () => {
    const mockSwap = jest.fn()
    render(<MealCell item={mockItem} isEaten={false} onToggleEaten={jest.fn()} onSwap={mockSwap} isSwapping={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Swap meal' }))
    expect(mockSwap).toHaveBeenCalledWith(mockItem)
  })

  it('disables swap button when isSwapping is true', () => {
    render(<MealCell item={mockItem} isEaten={false} onToggleEaten={jest.fn()} onSwap={jest.fn()} isSwapping={true} />)
    expect(screen.getByRole('button', { name: /swap/i })).toBeDisabled()
  })
})
