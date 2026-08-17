import { describe, expect, it } from 'vitest'

import { extractResponseText, normalizeAiMappings } from './api-client.js'

describe('extension AI client', () => {
  it('reads OpenAI-compatible and custom JSON responses', () => {
    expect(extractResponseText({ choices: [{ message: { content: '{"mappings":[]}' } }] }, 'choices.0.message.content')).toBe('{"mappings":[]}')
    expect(extractResponseText({ data: { answer: 'ok' } }, 'data.answer')).toBe('ok')
  })

  it('keeps only valid mapping objects from model JSON', () => {
    expect(normalizeAiMappings('{"mappings":[{"fieldId":"one","value":"A"},{"fieldId":2,"value":"B"}]}')).toEqual([{ fieldId: 'one', value: 'A' }])
  })
})
