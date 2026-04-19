jest.mock('@/lib/supabase/client')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SecurityForm from '@/components/settings/security-form'
import { createClient } from '@/lib/supabase/client'

const mockUpdateUser = jest.fn()
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateUser.mockResolvedValue({ error: null })
  mockCreateClient.mockReturnValue({
    auth: { updateUser: mockUpdateUser },
  } as never)
})

describe('SecurityForm', () => {
  it('shows current email as read-only context', () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new password/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with email on valid email submit', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
    })
  })

  it('shows success message after email update', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText(/email updated/i)).toBeInTheDocument()
  })

  it('calls updateUser with password on valid password submit', async () => {
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' })
    })
  })

  it('shows error message when email update fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Email already in use' } })
    render(<SecurityForm currentEmail="user@example.com" />)
    await userEvent.type(screen.getByLabelText(/new email/i), 'taken@example.com')
    fireEvent.click(screen.getByRole('button', { name: /update email/i }))
    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument()
  })
})
