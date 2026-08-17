import { describe, expect, it } from 'vitest'

import { calculateSupport, recommendProfile } from './profile-matching.js'

describe('profile recommendations', () => {
  it('recommends the resume version whose role keywords match the analyzed job page', () => {
    const result = recommendProfile([
      { id: 'consulting', label: 'Consulting', roleKeywords: ['consulting', 'strategy'] },
      { id: 'product', label: 'Product', roleKeywords: ['product manager', '产品经理'] },
    ], { pageTitle: '腾讯 2027 产品经理实习生', contextText: '产品经理 校园招聘' })

    expect(result).toMatchObject({ profileId: 'product', label: 'Product', matchedKeywords: ['产品经理'] })
  })

  it('does not suggest a profile when none of its keywords appear on the job page', () => {
    const result = recommendProfile([{ id: 'consulting', label: 'Consulting', roleKeywords: ['consulting'] }], { pageTitle: 'Frontend engineer', contextText: 'Software development internship' })

    expect(result).toBeNull()
  })
})

describe('form support score', () => {
  it('reports the ready share across every analyzed field and retains manual totals', () => {
    const result = calculateSupport([
      { status: 'ready' },
      { status: 'ready' },
      { status: 'manual' },
      { status: 'sensitive' },
    ])

    expect(result).toEqual({ total: 4, ready: 2, manual: 1, sensitive: 1, unsupported: 0, skipped: 0, percentage: 50 })
  })
})
