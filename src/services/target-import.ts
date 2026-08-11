import type { ApplicationTarget, Job } from '../domain/types'

const separator = /\s*(?:\||\t|,|，)\s*/

function validUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function idFor(url: string, role: string, index: number): string {
  const hash = [...`${url}|${role}|${index}`].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 17)
  return `target-${hash.toString(36)}`
}

export function parseApplicationTargets(input: string, importedAt = new Date().toISOString()): { targets: ApplicationTarget[]; errors: string[] } {
  const errors: string[] = []
  const targets = input.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return []
    const [urlValue, ...roleParts] = trimmed.split(separator)
    const sourceUrl = validUrl(urlValue)
    const targetRole = roleParts.join(' ').trim()
    if (!sourceUrl || !targetRole) {
      errors.push(`第 ${index + 1} 行需包含有效 URL 与职位目标`)
      return []
    }
    return [{ id: idFor(sourceUrl, targetRole, index), sourceUrl, targetRole, importedAt, status: 'imported' as const }]
  })
  return { targets, errors }
}

export function targetToJob(target: ApplicationTarget, graduationYear: number, now = new Date().toISOString().slice(0, 10)): Job {
  if (!target.analysis) throw new Error('请先完成入口检测并审核建议')
  const entryUrl = validUrl(target.analysis.applicationUrl) ?? target.sourceUrl
  return {
    id: `custom-${target.id}`,
    employer: `custom-${new URL(entryUrl).hostname}`,
    employerLabel: target.analysis.companyName || new URL(entryUrl).hostname,
    role: target.targetRole,
    track: 'primary',
    city: '待官网职位页确认',
    sourceUrl: entryUrl,
    sourceConfidence: 'candidate-reviewed',
    capturedAt: now,
    graduationYears: [graduationYear],
    jobType: 'internship',
    returnOffer: 'unknown',
    keywords: [],
    requirements: [],
    requiredFacts: ['name', 'email', 'phone', 'education', 'resume'],
    screeningQuestions: [],
    description: `候选人确认的申请入口。模型依据：${target.analysis.reason}`,
  }
}
