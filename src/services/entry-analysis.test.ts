import { describe, expect, it } from 'vitest'

import { analyzeApplicationEntries, normalizeEntryAnalyses } from './entry-analysis'
import { seedProvider } from '../domain/seed'

const target = { id: 'target-1', sourceUrl: 'https://careers.example.com/', targetRole: '商业分析实习生', importedAt: '2026-08-11T00:00:00.000Z', status: 'imported' as const }

describe('application entry analysis', () => {
  it('falls back to the candidate-provided URL when model output is not an HTTP(S) URL', () => {
    const analyses = normalizeEntryAnalyses([target], { targets: [{ targetId: 'target-1', companyName: '示例公司', applicationUrl: 'javascript:alert(1)', confidence: 140, reason: '链接', warnings: ['需登录'] }] })

    expect(analyses['target-1']).toMatchObject({ applicationUrl: 'https://careers.example.com/', confidence: 100, companyName: '示例公司' })
  })

  it('passes inspected page evidence to the configured model and normalizes its JSON', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ targets: [{ targetId: 'target-1', companyName: '示例公司', applicationUrl: 'https://careers.example.com/apply', confidence: 89, reason: '申请链接文本匹配', warnings: [], requiresLogin: false }] }) } }] }), { status: 200 })) as typeof fetch
    const analyses = await analyzeApplicationEntries([{ targetId: 'target-1', sourceUrl: target.sourceUrl, targetRole: target.targetRole, inspection: { pageUrl: target.sourceUrl, pageTitle: '招聘', excerpt: '商业分析实习生 立即申请', links: [{ text: '立即申请', url: 'https://careers.example.com/apply' }], capturedAt: '2026-08-11T00:00:00.000Z' } }], { ...seedProvider, model: 'test', apiKey: 'test-key' }, fetcher)

    expect(analyses['target-1']).toMatchObject({ applicationUrl: 'https://careers.example.com/apply', confidence: 89 })
  })
})
