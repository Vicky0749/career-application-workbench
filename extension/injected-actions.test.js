import { describe, expect, it } from 'vitest'

import { inspectRecruitmentPage, prefillRecruitmentPage } from './injected-actions.js'

describe('dynamic site actions', () => {
  it('captures visible page text and resolves candidate links', () => {
    document.body.innerHTML = '<h1>招聘官网</h1><a href="/apply">立即申请</a>'
    document.title = '招聘入口'
    const result = inspectRecruitmentPage()

    expect(result).toMatchObject({ pageTitle: '招聘入口', excerpt: '招聘官网立即申请' })
    expect(result.links[0]).toMatchObject({ text: '立即申请' })
  })

  it('uses the same safe fields for a dynamically authorized site', () => {
    document.body.innerHTML = '<input name="name"><input type="email">'
    const result = prefillRecruitmentPage({ name: '王温翔', email: 'wang@example.com', phone: '', education: '', resumeFileName: '' })

    expect(result.audit.filter((entry) => entry.status === 'filled').map((entry) => entry.key)).toEqual(['name', 'email'])
    expect(document.querySelector('input[name="name"]').value).toBe('王温翔')
  })
})
