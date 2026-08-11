import { describe, expect, it } from 'vitest'

import { rankJob } from './matching'
import type { CandidateProfile, Job } from './types'

const profile: CandidateProfile = {
  name: '王温翔',
  email: 'wang@example.com',
  phone: '13800000000',
  graduationYear: 2028,
  education: '厦门大学会计硕士',
  locationPreference: ['深圳', '上海'],
  resumeFileName: '王温翔_简历.pdf',
  evidence: [
    {
      id: 'eyp-research',
      title: '行业与竞品研究',
      organization: 'EY-Parthenon',
      period: '2026',
      summary: '完成 AI 手机产业研究、竞品调研与商业 war gaming 支持。',
      skills: ['行业研究', '竞品分析', '商业分析', '结构化表达'],
      sourceNote: '候选人经历池',
      verified: true,
    },
  ],
}

const tencentRole: Job = {
  id: 'tencent-business-analysis',
  employer: 'tencent',
  employerLabel: '腾讯',
  role: '商业分析实习生',
  track: 'primary',
  city: '深圳',
  sourceUrl: 'https://join.qq.com/',
  sourceConfidence: 'official-live',
  capturedAt: '2026-08-10',
  graduationYears: [2028],
  jobType: 'internship',
  returnOffer: 'unknown',
  keywords: ['商业分析', '行业研究', '数据分析'],
  requirements: ['行业研究', '数据分析'],
  requiredFacts: ['name', 'email', 'phone', 'education', 'resume'],
  screeningQuestions: [],
  description: '支持经营问题拆解、行业研究和数据分析。',
}

describe('rankJob', () => {
  it('ranks a current, eligible Tencent primary-track role from evidence and explains the gap', () => {
    const result = rankJob(profile, tencentRole, '2026-08-11')

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.matchedSkills).toContain('行业研究')
    expect(result.missingRequirements).toContain('数据分析')
    expect(result.reasons).toContain('2028 届可投')
    expect(result.isStale).toBe(false)
  })

  it('marks an old or wrong-cohort posting stale and ranks it below the qualifying role', () => {
    const staleRole: Job = {
      ...tencentRole,
      id: 'huawei-stale',
      role: '商业分析校招',
      city: '东莞',
      capturedAt: '2026-07-01',
      graduationYears: [2027],
    }

    const current = rankJob(profile, tencentRole, '2026-08-11')
    const stale = rankJob(profile, staleRole, '2026-08-11')

    expect(stale.isStale).toBe(true)
    expect(stale.reasons).toContain('届别不匹配')
    expect(stale.score).toBeLessThan(current.score)
  })
})
