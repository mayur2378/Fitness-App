// __tests__/lib/claude.test.ts
import { APIError } from '@anthropic-ai/sdk'
import { callClaude, ClaudeError } from '../../lib/claude'

// Mock the @anthropic-ai/sdk module
jest.mock('@anthropic-ai/sdk')

const mockCreate = jest.fn()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AnthropicMock = require('@anthropic-ai/sdk').default

beforeEach(() => {
  jest.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  AnthropicMock.mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
})

describe('callClaude', () => {
  it('happy path — returns trimmed text when stop_reason is end_turn', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '  Hello, world!  ' }],
    })

    const result = await callClaude('Say hello')
    expect(result).toBe('Hello, world!')
  })

  it('throws ClaudeError with retriable: true when stop_reason !== end_turn', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: 'partial response' }],
    })

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: true,
      message: expect.stringContaining('max_tokens'),
    })
  })

  it('maps APIError 429 to ClaudeError with retriable: true', async () => {
    const err = Object.create(APIError.prototype)
    err.status = 429
    err.message = 'Rate limited'
    mockCreate.mockRejectedValueOnce(err)

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: true,
      message: expect.stringContaining('429'),
    })
  })

  it('maps APIError 500 to ClaudeError with retriable: true', async () => {
    const err = Object.create(APIError.prototype)
    err.status = 500
    err.message = 'Internal Server Error'
    mockCreate.mockRejectedValueOnce(err)

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: true,
      message: expect.stringContaining('500'),
    })
  })

  it('maps APIError 400 to ClaudeError with retriable: false', async () => {
    const err = Object.create(APIError.prototype)
    err.status = 400
    err.message = 'Bad Request'
    mockCreate.mockRejectedValueOnce(err)

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: false,
      message: expect.stringContaining('400'),
    })
  })

  it('throws ClaudeError with retriable: false when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: false,
      message: expect.stringContaining('ANTHROPIC_API_KEY'),
    })
  })

  it('throws ClaudeError with retriable: false for non-text content block', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'tool_use', id: 'tool-1', name: 'some_tool', input: {} }],
    })

    await expect(callClaude('test prompt')).rejects.toMatchObject({
      name: 'ClaudeError',
      retriable: false,
      message: expect.stringContaining('non-text'),
    })
  })
})
