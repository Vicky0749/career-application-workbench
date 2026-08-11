import type { ApplicationEntryAnalysis, ApplicationTarget, PageInspection, ProviderConfig } from '../domain/types'
import { requestModelText } from './model-client'

type Fetcher = typeof fetch

export interface InspectedApplicationTarget {
  targetId: string
  sourceUrl: string
  targetRole: string
  inspection: PageInspection
}

const stripJsonFence = (value: string) => value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

function httpUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  try {
    const url = new URL(value, fallback)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : fallback
  } catch {
    return fallback
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 8) : []
}

function analysisFor(target: Pick<ApplicationTarget, 'id' | 'sourceUrl'>, value: unknown): ApplicationEntryAnalysis {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const confidence = typeof candidate.confidence === 'number' ? candidate.confidence : Number(candidate.confidence)
  let host = target.sourceUrl
  try { host = new URL(target.sourceUrl).hostname } catch { /* source URL already validated on import */ }
  return {
    companyName: typeof candidate.companyName === 'string' && candidate.companyName.trim() ? candidate.companyName.trim() : host,
    applicationUrl: httpUrl(candidate.applicationUrl, target.sourceUrl),
    confidence: Number.isFinite(confidence) ? Math.min(100, Math.max(0, confidence)) : 0,
    reason: typeof candidate.reason === 'string' && candidate.reason.trim() ? candidate.reason.trim() : '模型未提供足够的入口依据，请人工复核页面链接。',
    warnings: stringList(candidate.warnings),
    detectedAts: typeof candidate.detectedAts === 'string' && candidate.detectedAts.trim() ? candidate.detectedAts.trim() : undefined,
    requiresLogin: candidate.requiresLogin === true,
  }
}

export function normalizeEntryAnalyses(targets: ApplicationTarget[], payload: unknown): Record<string, ApplicationEntryAnalysis> {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const entries = Array.isArray(root.targets) ? root.targets : Array.isArray(root.entries) ? root.entries : []
  const byId = new Map(entries.flatMap((entry) => entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).targetId === 'string' ? [[(entry as Record<string, unknown>).targetId, entry]] : []))
  return Object.fromEntries(targets.map((target) => [target.id, analysisFor(target, byId.get(target.id))]))
}

export async function analyzeApplicationEntries(targets: InspectedApplicationTarget[], provider: ProviderConfig, fetcher: Fetcher = fetch): Promise<Record<string, ApplicationEntryAnalysis>> {
  if (!targets.length) return {}
  const prompt = `分析下列招聘页面，识别每个目标职位最适合的申请入口。只根据提供的正文和链接判断，不得编造 URL。严格返回 JSON：{ "targets": [{ "targetId": string, "companyName": string, "applicationUrl": string, "confidence": 0-100, "reason": string, "warnings": string[], "detectedAts": string?, "requiresLogin": boolean }] }。\n\n页面数据：\n${JSON.stringify(targets.map((target) => ({ targetId: target.targetId, sourceUrl: target.sourceUrl, targetRole: target.targetRole, title: target.inspection.pageTitle, excerpt: target.inspection.excerpt.slice(0, 18_000), links: target.inspection.links.slice(0, 60) })))} `
  const content = await requestModelText(provider, '你是严谨的招聘官网入口分析器。只返回 JSON，不要 Markdown。', prompt, fetcher)
  let payload: unknown
  try {
    payload = JSON.parse(stripJsonFence(content))
  } catch {
    throw new Error('模型返回的入口分析不是有效 JSON，请检查模型与响应路径配置')
  }
  return normalizeEntryAnalyses(targets.map((target) => ({ id: target.targetId, sourceUrl: target.sourceUrl } as ApplicationTarget)), payload)
}
