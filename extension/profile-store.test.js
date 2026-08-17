import { describe, expect, it } from 'vitest'

import { createProfile, normalizeState } from './profile-store.js'

describe('local profile store', () => {
  it('normalizes legacy or partial state without persisting secret defaults', () => {
    const state = normalizeState({ profiles: [{ id: 'one', label: 'Consulting', fields: { name: 'Vincent' } }], activeProfileId: 'missing', provider: { baseUrl: 'https://api.example.com' } })

    expect(state.activeProfileId).toBe('one')
    expect(state.profiles[0].fields).toMatchObject({ name: 'Vincent', email: '', graduationDate: '' })
    expect(state.profiles[0].customAnswers).toEqual([])
    expect(state.provider).toMatchObject({ baseUrl: 'https://api.example.com', apiKey: '', protocol: 'openai-compatible' })
  })

  it('creates an isolated profile with stable field and answer containers', () => {
    const profile = createProfile('Product resume', 'profile-test')

    expect(profile).toMatchObject({ id: 'profile-test', label: 'Product resume', fields: { name: '', portfolio: '' }, customAnswers: [] })
  })
})
