import type { CandidateProfile, Job, MatchResult } from './types'

const TRACK_POINTS = {
  primary: 25,
  challenge: 20,
  base: 18,
} as const

function daysBetween(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000)
}

function hasSkill(profile: CandidateProfile, requirement: string): boolean {
  const normalizedRequirement = requirement.toLocaleLowerCase()
  return profile.evidence.some((evidence) =>
    evidence.verified && evidence.skills.some((skill) => skill.toLocaleLowerCase() === normalizedRequirement),
  )
}

export function rankJob(profile: CandidateProfile, job: Job, today: string): MatchResult {
  const matchedSkills = job.requirements.filter((requirement) => hasSkill(profile, requirement))
  const missingRequirements = job.requirements.filter((requirement) => !hasSkill(profile, requirement))
  const isEligible = job.graduationYears.includes(profile.graduationYear)
  const isPreferredCity = profile.locationPreference.includes(job.city)
  const isStale = daysBetween(job.capturedAt, today) > 5
  const reasons: string[] = []
  let score = TRACK_POINTS[job.track]

  reasons.push(job.track === 'primary' ? '主目标赛道' : job.track === 'challenge' ? '挑战目标赛道' : '兜底目标赛道')

  if (isEligible) {
    score += 20
    reasons.push(`${profile.graduationYear} 届可投`)
  } else {
    score -= 20
    reasons.push('届别不匹配')
  }

  if (job.sourceConfidence === 'official-live') {
    score += 15
    reasons.push('已核验官方实时职位页')
  } else if (job.sourceConfidence === 'official-entry') {
    score += 5
    reasons.push('官方招聘入口待复核具体 JD')
  } else {
    score -= 12
    reasons.push('仅为线索来源，需回到官网复核')
  }

  if (isPreferredCity) {
    score += 10
    reasons.push('符合城市偏好')
  }

  if (matchedSkills.length > 0) {
    score += matchedSkills.length * 8
    reasons.push(`已命中 ${matchedSkills.length} 项可核验经历能力`)
  }

  if (isStale) {
    score -= 15
    reasons.push('超过 5 天未复核')
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedSkills,
    missingRequirements,
    reasons,
    isStale,
  }
}
