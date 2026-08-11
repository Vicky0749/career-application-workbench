import type { CandidateProfile, Job, ReviewResult } from './types'

const factLabels = {
  name: '姓名',
  email: '邮箱',
  phone: '联系电话',
  education: '教育经历',
  resume: '简历文件',
} as const

export function evaluateReview(profile: CandidateProfile, job: Job, answers: Record<string, string>): ReviewResult {
  const blockers: string[] = []

  if (!job.sourceUrl.startsWith('https://')) blockers.push('缺少官方职位链接')
  if (job.sourceConfidence !== 'official-live') blockers.push('需复核官方职位页面')
  if (job.graduationYears.length === 0) blockers.push('未确认适用毕业届别')
  if (!job.graduationYears.includes(profile.graduationYear)) blockers.push('职位届别与候选人不匹配')
  if (!job.city.trim()) blockers.push('未确认工作地点')

  for (const fact of job.requiredFacts) {
    const value = fact === 'resume' ? profile.resumeFileName : profile[fact]
    if (!value.trim()) blockers.push(`缺少${factLabels[fact]}`)
  }

  for (const question of job.screeningQuestions) {
    if (!answers[question]?.trim()) blockers.push(`待人工回答：${question}`)
  }

  return blockers.length === 0
    ? { status: 'ready_to_prefill', blockers: [] }
    : { status: 'review_required', blockers }
}
