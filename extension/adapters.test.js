import { describe, expect, it } from 'vitest'

import { ADAPTERS, collectJobPage, resolveAdapter } from './adapters.js'

describe('official site adapters', () => {
  it('accepts exactly the three first-release employer domains', () => {
    expect(resolveAdapter('https://career.huawei.com/reccampportal/')).toMatchObject({ id: 'huawei' })
    expect(resolveAdapter('https://join.qq.com/apply')).toMatchObject({ id: 'tencent' })
    expect(resolveAdapter('https://www.pwccn.com/zh/careers.html')).toMatchObject({ id: 'pwc-china' })
    expect(resolveAdapter('https://jobs.linkedin.com/')).toBeUndefined()
  })

  it('collects visible job details and rejects a page without a readable title', () => {
    const adapter = { id: 'tencent', titleSelectors: ['h1'], locationSelectors: ['.location'], descriptionSelectors: ['main'] }
    const page = new DOMParser().parseFromString('<h1>商业分析实习生</h1><div class="location">深圳</div><main>行业研究与数据分析</main>', 'text/html')
    const missingTitle = new DOMParser().parseFromString('<main>无岗位标题</main>', 'text/html')

    expect(collectJobPage(page, 'https://join.qq.com/apply', adapter)).toMatchObject({ ok: true, title: '商业分析实习生', location: '深圳' })
    expect(collectJobPage(missingTitle, 'https://join.qq.com/apply', adapter)).toEqual({ ok: false, error: '未识别岗位标题' })
  })

  it('does not ship a submit selector in any official adapter', () => {
    expect(JSON.stringify(ADAPTERS).toLowerCase()).not.toContain('submit')
  })
})
