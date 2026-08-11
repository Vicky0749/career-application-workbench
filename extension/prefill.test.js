import { describe, expect, it } from 'vitest'

import { buildPrefillPlan } from './prefill.js'

describe('prefill plan', () => {
  it('maps approved candidate facts and excludes submission controls', () => {
    const plan = buildPrefillPlan({
      name: '王温翔',
      email: 'wang@example.com',
      phone: '13800000000',
      education: '厦门大学会计硕士',
      resumeFileName: '王温翔_简历.pdf',
    })

    expect(plan.map((field) => field.key)).toEqual(['name', 'email', 'phone', 'education', 'resume'])
    expect(plan.every((field) => !field.key.includes('submit'))).toBe(true)
    expect(plan.every((field) => !field.selectors.some((selector) => selector.includes('submit')))).toBe(true)
  })

  it('marks a missing fact for review instead of creating an empty fill action', () => {
    const plan = buildPrefillPlan({ name: '王温翔', email: '', phone: '', education: '', resumeFileName: '' })

    expect(plan.filter((field) => field.status === 'needs_review').map((field) => field.key)).toEqual(['email', 'phone', 'education', 'resume'])
  })
})
