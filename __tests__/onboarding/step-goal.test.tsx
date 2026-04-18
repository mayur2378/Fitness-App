import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepGoal from '@/components/onboarding/step-goal'

const mockOnNext = jest.fn()
beforeEach(() => mockOnNext.mockClear())

describe('StepGoal', () => {
  it('renders goal selector and target weight input', () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/target weight/i)).toBeInTheDocument()
  })

  it('shows validation error for missing target weight', async () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/target weight is required/i)).toBeInTheDocument()
    expect(mockOnNext).not.toHaveBeenCalled()
  })

  it('calls onNext with valid values', async () => {
    render(<StepGoal onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/target weight/i), '70')
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(mockOnNext).toHaveBeenCalledWith(
      expect.objectContaining({ target_weight_kg: 70 })
    )
  })
})
