import { render, screen, fireEvent } from '@testing-library/react'
import WorkoutCard from '@/components/workouts/workout-card'
import type { WorkoutPlanItem } from '@/lib/types'

const mockItem: WorkoutPlanItem = {
  id: 'item-1',
  workout_plan_id: 'plan-1',
  day_of_week: 'mon',
  name: 'Push Day',
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 10, weight_kg: 60 },
    { name: 'Push-Up', sets: 3, reps: 12, weight_kg: 0 },
  ],
}

describe('WorkoutCard', () => {
  it('renders day, workout name, and exercise list', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    expect(screen.getByText('Push Day')).toBeInTheDocument()
    expect(screen.getByText(/bench press/i)).toBeInTheDocument()
    expect(screen.getByText(/push-up/i)).toBeInTheDocument()
  })

  it('clicking Log workout switches to log mode', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('log mode inputs are pre-filled with target values', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    expect(screen.getByLabelText('Bench Press Sets')).toHaveValue(3)
    expect(screen.getByLabelText('Bench Press kg')).toHaveValue(60)
  })

  it('cancel returns to view mode', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /log workout/i })).toBeInTheDocument()
  })

  it('save calls onSave with correct payload', () => {
    const mockSave = jest.fn()
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={mockSave} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      workout_plan_item_id: 'item-1',
      completed: true,
      exercises_logged: expect.arrayContaining([
        expect.objectContaining({ name: 'Bench Press', actual_sets: 3, actual_reps: 10, actual_weight_kg: 60 }),
      ]),
    }))
  })

  it('shows completed badge when isLogged is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={true} onSave={jest.fn()} isSaving={false} />)
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
  })

  it('Log workout button is absent when isLogged is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={true} onSave={jest.fn()} isSaving={false} />)
    expect(screen.queryByRole('button', { name: /log workout/i })).not.toBeInTheDocument()
  })

  it('save button shows Saving and is disabled when isSaving is true', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={true} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    const saveBtn = screen.getByRole('button', { name: /saving/i })
    expect(saveBtn).toBeDisabled()
  })

  it('cancel resets inputs to target values', () => {
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={jest.fn()} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.change(screen.getByLabelText('Bench Press Sets'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    expect(screen.getByLabelText('Bench Press Sets')).toHaveValue(3)
  })

  it('modifying inputs updates the save payload', () => {
    const mockSave = jest.fn()
    render(<WorkoutCard item={mockItem} isLogged={false} onSave={mockSave} isSaving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /log workout/i }))
    fireEvent.change(screen.getByLabelText('Bench Press Sets'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      exercises_logged: expect.arrayContaining([
        expect.objectContaining({ name: 'Bench Press', actual_sets: 5 }),
      ]),
    }))
  })
})
