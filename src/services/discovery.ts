import type { CandidateProfile, CareerTrack, EmployerId, Job, ProviderConfig, SearchHit } from '../domain/types'

type Fetcher = typeof fetch

const employerSources: Record<EmployerId, { label: string; domain: string; careersUrl: string }> = {
  huawei: { label: '华为', domain: 'career.huawei.com', careersUrl: 'https://career.huawei.com/' },
  tencent: { label: '腾讯', domain: 'join.qq.com', careersUrl: 'https://join.qq.com/' },
  'pwc-china': { label: 'PwC 中国', domain: 'www.pwccn.com', careersUrl: 'https://www.pwccn.com/zh/careers.html' },
}

const baseKeywords = ['商业分析', '经营分析', '战略运营', '行业研究', '咨询', '财务分析']

export function readPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)]
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, value)
}

export function normalizeSearchPayload(payload: unknown, resultPath = ''): SearchHit[] {
  const root = readPath(payload, resultPath)
  const candidates = Array.isArray(root) ? root : [
    readPath(payload, 'results'),
    readPath(payload, 'items'),
    readPath(payload, 'data.results'),
    readPath(payload, 'organic'),
  ].find(Array.isArray)
  if (!Array.isArray(candidates)) return []
  return candidates.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const item = value as Record<string, unknown>
    const title = [item.title, item.name].find((candidate): candidate is string => typeof candidate === 'string')?.trim() ?? ''
    const url = [item.url, item.link, item.href].find((candidate): candidate is string => typeof candidate === 'string')?.trim() ?? ''
    if (!title || !url) return []
    const summary = [item.content, item.snippet, item.description, item.body].find((candidate): candidate is string => typeof candidate === 'string')?.trim() ?? ''
    const publishedAt = [item.published_date, item.publishedAt, item.date].find((candidate): candidate is string => typeof candidate === 'string')?.trim()
    return [{ title, url, summary, publishedAt }]
  })
}

export function officialSearchQueries(profile: CandidateProfile): Array<{ employer: EmployerId; query: string }> {
  const extraSkills = profile.evidence.flatMap((evidence) => evidence.skills).filter(Boolean).slice(0, 3)
  const keywords = [...new Set([...baseKeywords, ...extraSkills])].slice(0, 7).join(' OR ')
  return (Object.entries(employerSources) as Array<[EmployerId, typeof employerSources[EmployerId]]>).map(([employer, source]) => ({
    employer,
    query: `site:${source.domain} (${keywords}) (实习 OR intern OR internship) ${profile.graduationYear}届`,
  }))
}

function isOfficialUrl(url: string, employer: EmployerId): boolean {
  try {
    const hostname = new URL(url).hostname
    const domain = employerSources[employer].domain
    return hostname === domain || hostname.endsWith(`.${domain}`)
  } catch {
    return false
  }
}

function trackFor(text: string): CareerTrack {
  const normalized = text.toLocaleLowerCase()
  if (/咨询|consult|战略|strategy|行业研究/.test(normalized)) return 'challenge'
  if (/财务|会计|审计|交易|finance|accounting/.test(normalized)) return 'base'
  return 'primary'
}

function jobTypeFor(text: string): Job['jobType'] {
  return /校招|graduate|应届/.test(text.toLocaleLowerCase()) ? 'graduate' : 'internship'
}

function skillsFor(text: string): string[] {
  const candidates = ['行业研究', '数据分析', '数据处理', 'Excel', 'SQL', '财务分析', '英语沟通', '结构化表达']
  return candidates.filter((skill) => text.toLocaleLowerCase().includes(skill.toLocaleLowerCase()))
}

function idFor(employer: EmployerId, url: string): string {
  const hash = [...url].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7)
  return `${employer}-discovered-${hash.toString(36)}`
}

export function jobFromHit(hit: SearchHit, employer: EmployerId, profile: CandidateProfile, today = new Date().toISOString().slice(0, 10)): Job | undefined {
  if (!isOfficialUrl(hit.url, employer)) return undefined
  const source = employerSources[employer]
  const combined = `${hit.title} ${hit.summary}`
  return {
    id: idFor(employer, hit.url),
    employer,
    employerLabel: source.label,
    role: hit.title,
    track: trackFor(combined),
    city: '待官网职位页确认',
    sourceUrl: hit.url,
    sourceConfidence: 'official-entry',
    capturedAt: today,
    postedAt: hit.publishedAt,
    graduationYears: [profile.graduationYear],
    jobType: jobTypeFor(combined),
    returnOffer: 'unknown',
    keywords: skillsFor(combined),
    requirements: skillsFor(combined),
    requiredFacts: ['name', 'email', 'phone', 'education', 'resume'],
    screeningQuestions: [],
    description: hit.summary || '由搜索接口返回，需在官网职位页完成 JD 与届别复核。',
  }
}

export async function discoverOfficialJobs(profile: CandidateProfile, provider: ProviderConfig, fetcher: Fetcher = fetch): Promise<Job[]> {
  if (!provider.searchUrl.trim()) throw new Error('请先填写搜索 API URL')
  const calls = officialSearchQueries(profile).map(async ({ employer, query }) => {
    const response = await fetcher(provider.searchUrl.trim(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(provider.searchApiKey.trim() ? { authorization: `Bearer ${provider.searchApiKey.trim()}` } : {}),
      },
      body: JSON.stringify({ query, max_results: 12 }),
    })
    if (!response.ok) throw new Error(`${employerSources[employer].label} 搜索失败：${response.status}`)
    const hits = normalizeSearchPayload(await response.json(), provider.searchResultPath)
    return hits.map((hit) => jobFromHit(hit, employer, profile)).filter((job): job is Job => Boolean(job))
  })
  const lists = await Promise.all(calls)
  const found = lists.flat()
  if (!found.length) throw new Error('搜索接口未返回可验证的官网职位链接，请检查 API 响应路径或关键词')
  return found
}

export { employerSources }
