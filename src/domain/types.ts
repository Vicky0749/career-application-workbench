export type CareerTrack = 'primary' | 'challenge' | 'base'

export type EmployerId = 'huawei' | 'tencent' | 'pwc-china'

export type SourceConfidence = 'official-live' | 'official-entry' | 'lead'

export type ReviewStatus = 'discovered' | 'qualified' | 'review_required' | 'ready_to_prefill'

export interface Evidence {
  id: string
  title: string
  organization: string
  period: string
  summary: string
  skills: string[]
  sourceNote: string
  verified: boolean
}

export interface CandidateProfile {
  name: string
  email: string
  phone: string
  graduationYear: number
  education: string
  locationPreference: string[]
  resumeFileName: string
  evidence: Evidence[]
}

export interface ResumeDraft {
  rawText: string
  name?: string
  email?: string
  phone?: string
  graduationYear?: number
  education?: string
  locationPreference?: string[]
  evidence: Evidence[]
}

export interface Job {
  id: string
  employer: EmployerId
  employerLabel: string
  role: string
  track: CareerTrack
  city: string
  sourceUrl: string
  sourceConfidence: SourceConfidence
  capturedAt: string
  postedAt?: string
  graduationYears: number[]
  jobType: 'internship' | 'graduate' | 'campus-program'
  returnOffer: 'confirmed' | 'unknown' | 'not_applicable'
  keywords: string[]
  requirements: string[]
  requiredFacts: Array<'name' | 'email' | 'phone' | 'education' | 'resume'>
  screeningQuestions: string[]
  description: string
}

export interface MatchResult {
  score: number
  matchedSkills: string[]
  missingRequirements: string[]
  reasons: string[]
  isStale: boolean
}

export interface ReviewResult {
  status: ReviewStatus
  blockers: string[]
}

export interface ProviderConfig {
  baseUrl: string
  model: string
  apiKey: string
  status: 'not_configured' | 'ready'
  modelProtocol: 'openai-compatible' | 'custom-json'
  modelRequestTemplate: string
  modelResponsePath: string
  modelHeadersJson: string
  searchUrl: string
  searchApiKey: string
  searchResultPath: string
  searchRequestTemplate: string
  searchHeadersJson: string
}

export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'closed' | 'rejected'

export type DispatchStage = 'not_selected' | 'queued' | 'prefilled' | 'needs_manual' | 'sending' | 'sent' | 'failed'

export interface DispatchRecord {
  stage: DispatchStage
  detail: string
  updatedAt: string
  tabId?: number
}

export interface SearchHit {
  title: string
  url: string
  summary: string
  publishedAt?: string
}
