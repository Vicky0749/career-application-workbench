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

  it('keeps a custom application target reviewable until it is confirmed or removed', () => {
    useWorkbenchStore.getState().resetDemo()
    const target = {
      id: 'target-example',
      sourceUrl: 'https://careers.example.com/',
      targetRole: 'Business Analytics Intern',
      importedAt: '2026-08-11T00:00:00.000Z',
      status: 'imported' as const,
    }

    useWorkbenchStore.getState().addApplicationTargets([target])
    useWorkbenchStore.getState().setTargetInspection('target-example', {
      pageUrl: target.sourceUrl,
      pageTitle: 'Example Careers',
      excerpt: 'Business analytics internship applications are open.',
      links: [{ text: 'Apply now', url: 'https://careers.example.com/jobs/123' }],
      capturedAt: '2026-08-11T00:01:00.000Z',
    })
    useWorkbenchStore.getState().setTargetAnalyses({
      'target-example': {
        companyName: 'Example',
        applicationUrl: 'https://careers.example.com/jobs/123',
        confidence: 88,
        reason: 'The inspected page links directly to the target job.',
        warnings: [],
        requiresLogin: false,
      },
    })
    useWorkbenchStore.getState().updateTargetAnalysis('target-example', { applicationUrl: 'https://careers.example.com/jobs/456' })
    useWorkbenchStore.getState().confirmApplicationTarget('target-example', 'custom-target-example')

    expect(useWorkbenchStore.getState().applicationTargets).toEqual([expect.objectContaining({
      id: 'target-example',
      status: 'confirmed',
      confirmedJobId: 'custom-target-example',
      analysis: expect.objectContaining({ applicationUrl: 'https://careers.example.com/jobs/456' }),
    })])

    useWorkbenchStore.getState().removeApplicationTarget('target-example')
    expect(useWorkbenchStore.getState().applicationTargets).toEqual([])
  })
})
