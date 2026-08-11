export type CareerTrack = 'primary' | 'challenge' | 'base'

export type EmployerId = string

export type SourceConfidence = 'official-live' | 'official-entry' | 'candidate-reviewed' | 'lead'

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

export interface CandidateLink {
  text: string
  url: string
}

export interface PageInspection {
  pageUrl: string
  pageTitle: string
  excerpt: string
  links: CandidateLink[]
  capturedAt: string
}

export interface ApplicationEntryAnalysis {
  companyName: string
  applicationUrl: string
  confidence: number
  reason: string
  warnings: string[]
  detectedAts?: string
  requiresLogin: boolean
}

export type ApplicationTargetStatus = 'imported' | 'inspected' | 'analyzed' | 'needs_review' | 'confirmed' | 'failed'

export interface ApplicationTarget {
  id: string
  sourceUrl: string
  targetRole: string
  importedAt: string
  status: ApplicationTargetStatus
  inspection?: PageInspection
  analysis?: ApplicationEntryAnalysis
  error?: string
  confirmedJobId?: string
}
