import { describe, expect, it } from 'vitest'

import { parseApplicationTargets, targetToJob } from './target-import'

describe('custom application target import', () => {
  it('imports multiple URL and role pairs while isolating malformed lines', () => {
    const { targets, errors } = parseApplicationTargets('https://careers.example.com, 商业分析实习生\ninvalid-url, 战略运营实习生\nhttps://jobs.example.org | 财务分析实习生', '2026-08-11T00:00:00.000Z')

    expect(targets).toHaveLength(2)
    expect(targets.map((target) => target.targetRole)).toEqual(['商业分析实习生', '财务分析实习生'])
    expect(errors).toEqual(['第 2 行需包含有效 URL 与职位目标'])
  })

  it('converts only a reviewed model recommendation into a custom job', () => {
    const target = parseApplicationTargets('https://careers.example.com, 商业分析实习生').targets[0]
    target.analysis = { companyName: '示例公司', applicationUrl: 'javascript:alert(1)', confidence: 80, reason: '申请链接', warnings: [], requiresLogin: false }

    const job = targetToJob(target, 2028, '2026-08-11')
    expect(job).toMatchObject({ employerLabel: '示例公司', sourceConfidence: 'candidate-reviewed', sourceUrl: 'https://careers.example.com/' })
  })
})
