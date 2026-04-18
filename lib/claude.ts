// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY environment variable')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected non-text response from Claude')
  return block.text.trim()
}
