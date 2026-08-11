import type { Evidence, ProviderConfig, ResumeDraft } from '../domain/types'

type Fetcher = typeof fetch

const completionPath = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`
}

const stripJsonFence = (value: string) => value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

function evidenceFromUnknown(value: unknown, index: number): Evidence | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Record<string, unknown>
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
  if (!title) return undefined
  return {
    id: `resume-${index}-${title.toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || 'evidence'}`,
    title,
    organization: typeof candidate.organization === 'string' ? candidate.organization.trim() : '待确认',
    period: typeof candidate.period === 'string' ? candidate.period.trim() : '待确认',
    summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : '',
    skills: Array.isArray(candidate.skills) ? candidate.skills.filter((skill): skill is string => typeof skill === 'string').map((skill) => skill.trim()).filter(Boolean) : [],
    sourceNote: '由简历解析生成，待本人核验',
    verified: false,
  }
}

export function resumeDraftFromJson(rawText: string, payload: unknown): ResumeDraft {
  const candidate = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const year = typeof candidate.graduationYear === 'number' ? candidate.graduationYear : Number(candidate.graduationYear)
  const locations = Array.isArray(candidate.locationPreference)
    ? candidate.locationPreference.filter((location): location is string => typeof location === 'string').map((location) => location.trim()).filter(Boolean)
    : []
  const evidence = Array.isArray(candidate.evidence)
    ? candidate.evidence.map(evidenceFromUnknown).filter((item): item is Evidence => Boolean(item))
    : []
  return {
    rawText,
    name: typeof candidate.name === 'string' ? candidate.name.trim() : undefined,
    email: typeof candidate.email === 'string' ? candidate.email.trim() : undefined,
    phone: typeof candidate.phone === 'string' ? candidate.phone.trim() : undefined,
    graduationYear: Number.isFinite(year) && year >= 2020 && year <= 2040 ? year : undefined,
    education: typeof candidate.education === 'string' ? candidate.education.trim() : undefined,
    locationPreference: locations,
    evidence,
  }
}

export function draftFromPlainText(rawText: string): ResumeDraft {
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = rawText.match(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/)?.[0]
  const graduationYear = Number(rawText.match(/20(?:2[0-9]|3[0-9])(?=\s*(?:届|年毕业|毕业))/)?.[0])
  return {
    rawText,
    email,
    phone,
    graduationYear: Number.isFinite(graduationYear) ? graduationYear : undefined,
    locationPreference: [],
    evidence: [],
  }
}

export async function readResumeFile(file: File): Promise<string> {
  const lowerName = file.name.toLocaleLowerCase()
  if (lowerName.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value.trim()
  }
  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || file.type.startsWith('text/')) return (await file.text()).trim()
  throw new Error('暂只支持 TXT、Markdown 与 DOCX。PDF 请粘贴可复制的正文后继续解析。')
}

export async function parseResumeWithProvider(rawText: string, provider: ProviderConfig, fetcher: Fetcher = fetch): Promise<ResumeDraft> {
  if (!provider.baseUrl.trim() || !provider.model.trim() || !provider.apiKey.trim()) throw new Error('请先在 AI 配置中填写 Base URL、模型名称和 API Key')
  const prompt = `请把以下中文/英文简历解析成严格 JSON。只提取简历中明确出现的事实，不要补写。返回对象字段：name, email, phone, graduationYear, education, locationPreference(string[]), evidence(array，每项含 title, organization, period, summary, skills(string[]))。\n\n简历：\n${rawText}`
  const response = await fetcher(completionPath(provider.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.apiKey.trim()}` },
    body: JSON.stringify({
      model: provider.model.trim(),
      temperature: 0,
      messages: [
        { role: 'system', content: '你是严谨的求职信息提取器。只返回 JSON，不要 Markdown。' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!response.ok) throw new Error(`模型请求失败：${response.status}`)
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('模型未返回可解析内容')
  try {
    return resumeDraftFromJson(rawText, JSON.parse(stripJsonFence(content)))
  } catch {
    throw new Error('模型返回的内容不是有效 JSON，请降低模型温度或更换兼容接口')
  }
}
