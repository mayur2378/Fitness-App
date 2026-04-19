import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepBasicStats from '@/components/onboarding/step-basic-stats'

const mockOnNext = jest.fn()

beforeEach(() => mockOnNext.mockClear())

describe('StepBasicStats', () => {
  it('renders age, weight, and height inputs', () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid age', async () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/age/i), '5')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText(/age must be between/i)).toBeInTheDocument()
    expect(mockOnNext).not.toHaveBeenCalled()
  })

  it('calls onNext with valid values', async () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{}} />)
    await userEvent.type(screen.getByLabelText(/age/i), '28')
    await userEvent.type(screen.getByLabelText(/weight/i), '75')
    await userEvent.type(screen.getByLabelText(/height/i), '175')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(mockOnNext).toHaveBeenCalledWith({ sex: 'male', age: 28, weight_kg: 75, height_cm: 175 })
  })

  it('pre-fills fields from defaultValues', () => {
    render(<StepBasicStats onNext={mockOnNext} defaultValues={{ age: 30, weight_kg: 80, height_cm: 180 }} />)
    expect(screen.getByLabelText(/age/i)).toHaveValue(30)
    expect(screen.getByLabelText(/weight/i)).toHaveValue(80)
    expect(screen.getByLabelText(/height/i)).toHaveValue(180)
  })
})
