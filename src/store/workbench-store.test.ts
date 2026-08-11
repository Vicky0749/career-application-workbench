import { describe, expect, it } from 'vitest'

import { useWorkbenchStore } from './workbench-store'

describe('workbench persistence migration', () => {
  it('fills new provider fields for a legacy persisted provider and removes persisted keys', () => {
    const merge = useWorkbenchStore.persist.getOptions().merge
    if (!merge) throw new Error('persist merge strategy is required')
    const merged = merge({ provider: { baseUrl: 'https://legacy.example', apiKey: 'old-key', searchApiKey: 'old-search-key' } }, useWorkbenchStore.getState())

    expect(merged.provider).toMatchObject({
      baseUrl: 'https://legacy.example',
      modelProtocol: 'openai-compatible',
      searchRequestTemplate: '{"query":{{queryJson}},"max_results":{{maxResults}}}',
      apiKey: '',
      searchApiKey: '',
    })
  })
})
