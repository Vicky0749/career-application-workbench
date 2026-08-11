export const ADAPTERS = [
  {
    id: 'huawei',
    label: '华为',
    host: 'career.huawei.com',
    titleSelectors: ['h1', '[data-job-title]', '.job-title', '.position-title'],
    locationSelectors: ['[data-job-location]', '.job-location', '.location', '.work-location'],
    descriptionSelectors: ['[data-job-description]', '.job-description', '.job-detail', 'main'],
  },
  {
    id: 'tencent',
    label: '腾讯',
    host: 'join.qq.com',
    titleSelectors: ['h1', '[data-job-title]', '.job-title', '.position-title'],
    locationSelectors: ['[data-job-location]', '.job-location', '.location', '.work-location'],
    descriptionSelectors: ['[data-job-description]', '.job-description', '.job-detail', 'main'],
  },
  {
    id: 'pwc-china',
    label: 'PwC 中国',
    host: 'www.pwccn.com',
    titleSelectors: ['h1', '[data-job-title]', '.job-title', '.position-title'],
    locationSelectors: ['[data-job-location]', '.job-location', '.location', '.work-location'],
    descriptionSelectors: ['[data-job-description]', '.job-description', '.job-detail', 'main'],
  },
]

function readFirstText(document, selectors) {
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim()
    if (text) return text
  }
  return ''
}

export function resolveAdapter(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return ADAPTERS.find((adapter) => hostname === adapter.host || hostname.endsWith(`.${adapter.host}`))
  } catch {
    return undefined
  }
}

export function collectJobPage(document, url, adapter = resolveAdapter(url)) {
  if (!adapter) return { ok: false, error: '当前页面不在已支持官网范围内' }

  const title = readFirstText(document, adapter.titleSelectors)
  if (!title) return { ok: false, error: '未识别岗位标题' }

  return {
    ok: true,
    employer: adapter.id,
    employerLabel: adapter.label,
    title,
    location: readFirstText(document, adapter.locationSelectors) || '待职位页确认',
    description: readFirstText(document, adapter.descriptionSelectors),
    url,
    capturedAt: new Date().toISOString(),
  }
}
