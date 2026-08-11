import { describe, expect, it } from 'vitest'

import { evaluateReview } from './review'
import type { CandidateProfile, Job } from './types'

const profile: CandidateProfile = {
  name: '王温翔',
  email: 'wang@example.com',
  phone: '',
  graduationYear: 2028,
  education: '厦门大学会计硕士',
  locationPreference: ['上海'],
  resumeFileName: '王温翔_简历.pdf',
  evidence: [],
}

const job: Job = {
  id: 'pwc-intern',
  employer: 'pwc-china',
  employerLabel: 'PwC 中国',
  role: '交易服务实习生',
  track: 'base',
  city: '上海',
  sourceUrl: 'https://www.pwccn.com/',
  sourceConfidence: 'official-live',
  capturedAt: '2026-08-11',
  graduationYears: [2028],
  jobType: 'internship',
  returnOffer: 'unknown',
  keywords: ['交易服务'],
  requirements: ['财务分析'],
  requiredFacts: ['name', 'email', 'phone', 'education', 'resume'],
  screeningQuestions: ['是否具备在中国大陆工作的合法资格？'],
  description: '支持交易服务项目。',
}

describe('evaluateReview', () => {
  it('blocks prefill when a required fact or screening answer is unknown', () => {
    const result = evaluateReview(profile, job, {})

    expect(result.status).toBe('review_required')
    expect(result.blockers).toContain('缺少联系电话')
    expect(result.blockers).toContain('待人工回答：是否具备在中国大陆工作的合法资格？')
  })

  it('allows a verified official job with complete facts and answers to reach prefill readiness', () => {
    const readyProfile = { ...profile, phone: '13800000000' }
    const result = evaluateReview(readyProfile, job, { '是否具备在中国大陆工作的合法资格？': '是' })

    expect(result).toEqual({ status: 'ready_to_prefill', blockers: [] })
  })

  it('allows a user-reviewed custom application entry into the prefill queue', () => {
    const readyProfile = { ...profile, phone: '13800000000' }
    const customJob = { ...job, sourceConfidence: 'candidate-reviewed' as const, sourceUrl: 'https://careers.example.com/apply', screeningQuestions: [] }

    expect(evaluateReview(readyProfile, customJob, {})).toEqual({ status: 'ready_to_prefill', blockers: [] })
  })
})
