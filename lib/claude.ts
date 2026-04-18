// lib/claude.ts
import Anthropic, { APIError } from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

export class ClaudeError extends Error {
  constructor(message: string, public readonly retriable: boolean) {
    super(message)
    this.name = 'ClaudeError'
  }
}

export async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new ClaudeError('Missing ANTHROPIC_API_KEY environment variable', false)

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    if (response.stop_reason !== 'end_turn') {
      throw new ClaudeError(
        `Claude response ended early (stop_reason: ${response.stop_reason})`,
        true
      )
    }

    const block = response.content[0]
    if (block.type !== 'text') throw new ClaudeError('Unexpected non-text response from Claude', false)
    return block.text.trim()
  } catch (err) {
    if (err instanceof ClaudeError) throw err
    if (err instanceof APIError) {
      const retriable = err.status === 429 || (err.status >= 500 && err.status < 600)
      throw new ClaudeError(`Claude API error (${err.status}): ${err.message}`, retriable)
    }
    throw err
  }
}
