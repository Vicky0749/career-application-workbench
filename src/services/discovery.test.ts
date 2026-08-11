import { describe, expect, it } from 'vitest'

import { discoverOfficialJobs, jobFromHit, normalizeSearchPayload, officialSearchQueries } from './discovery'
import { seedProfile } from '../domain/seed'
import { seedProvider } from '../domain/seed'

describe('official job discovery', () => {
  it('normalizes common search response fields', () => {
    expect(normalizeSearchPayload({ organic: [{ title: '商业分析实习生', link: 'https://join.qq.com/apply/1', snippet: '行业研究' }] })).toEqual([
      { title: '商业分析实习生', url: 'https://join.qq.com/apply/1', summary: '行业研究', publishedAt: undefined },
    ])
  })

  it('imports only official employer links and retains a verification boundary', () => {
    const official = jobFromHit({ title: '商业分析实习生', url: 'https://join.qq.com/apply/1', summary: '行业研究' }, 'tencent', seedProfile, '2026-08-11')
    const external = jobFromHit({ title: '转载职位', url: 'https://example.com/job', summary: '' }, 'tencent', seedProfile)

    expect(official).toMatchObject({ employer: 'tencent', sourceConfidence: 'official-entry', capturedAt: '2026-08-11' })
    expect(external).toBeUndefined()
    expect(officialSearchQueries(seedProfile)).toHaveLength(3)
  })

  it('calls the configured search endpoint and deduplicates official results into jobs', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ results: [{ title: '商业分析实习生', url: 'https://join.qq.com/apply/1', content: '行业研究' }] }), { status: 200 })) as typeof fetch
    const jobs = await discoverOfficialJobs(seedProfile, { ...seedProvider, searchUrl: 'https://search.example/api', searchResultPath: 'results' }, fetcher)

    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ employer: 'tencent', role: '商业分析实习生' })
  })

  it('renders a custom search JSON body before it calls the search gateway', async () => {
    const requestBodies: string[] = []
    const fetcher = (async (_input, init) => {
      requestBodies.push(String(init?.body))
      return new Response(JSON.stringify({ results: [] }), { status: 200 })
    }) as typeof fetch

    await expect(discoverOfficialJobs(seedProfile, { ...seedProvider, searchUrl: 'https://search.example/api', searchRequestTemplate: '{"phrase":{{queryJson}},"count":{{maxResults}}}' }, fetcher)).rejects.toThrow('搜索接口未返回可验证的官网职位链接')
    expect(JSON.parse(requestBodies[0])).toMatchObject({ count: 12 })
  })
})
