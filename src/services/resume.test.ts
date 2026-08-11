import { describe, expect, it } from 'vitest'

import { draftFromPlainText, parseResumeWithProvider, resumeDraftFromJson } from './resume'
import { seedProvider } from '../domain/seed'

describe('resume draft parsing', () => {
  it('keeps model-derived evidence unverified until the candidate confirms it', () => {
    const draft = resumeDraftFromJson('简历正文', {
      name: '王温翔',
      graduationYear: 2028,
      evidence: [{ title: '行业研究', organization: '示例公司', period: '2026', summary: '支持研究', skills: ['行业研究'] }],
    })

    expect(draft).toMatchObject({ name: '王温翔', graduationYear: 2028 })
    expect(draft.evidence).toHaveLength(1)
    expect(draft.evidence[0]).toMatchObject({ verified: false, sourceNote: '由简历解析生成，待本人核验' })
  })

  it('extracts low-risk contact hints from pasted text without inventing evidence', () => {
    const draft = draftFromPlainText('王温翔\nwang@example.com\n13800000000\n预计 2028 年毕业')

    expect(draft).toMatchObject({ email: 'wang@example.com', phone: '13800000000', graduationYear: 2028 })
    expect(draft.evidence).toEqual([])
  })

  it('uses the configured OpenAI-compatible endpoint for an audited draft', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ name: '王温翔', evidence: [] }) } }] }), { status: 200 })) as typeof fetch
    const draft = await parseResumeWithProvider('简历正文', { ...seedProvider, model: 'test-model', apiKey: 'test-key' }, fetcher)

    expect(draft).toMatchObject({ name: '王温翔', rawText: '简历正文', evidence: [] })
  })
})
