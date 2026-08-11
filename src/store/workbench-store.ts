import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { seedJobs, seedProfile, seedProvider } from '../domain/seed'
import type { ApplicationStatus, CandidateProfile, CareerTrack, DispatchRecord, Evidence, Job, ProviderConfig, ResumeDraft } from '../domain/types'

export type WorkbenchView = 'dashboard' | 'discover' | 'jobs' | 'review' | 'profile' | 'settings'
export type TrackFilter = 'all' | CareerTrack

interface WorkbenchState {
  activeView: WorkbenchView
  trackFilter: TrackFilter
  profile: CandidateProfile
  jobs: Job[]
  selectedJobId: string
  answers: Record<string, Record<string, string>>
  applications: Record<string, ApplicationStatus>
  selectedJobIds: string[]
  finalReviewJobIds: string[]
  dispatches: Record<string, DispatchRecord>
  resumeText: string
  resumeDraft?: ResumeDraft
  provider: ProviderConfig
  setActiveView: (view: WorkbenchView) => void
  setTrackFilter: (filter: TrackFilter) => void
  selectJob: (jobId: string) => void
  updateProfile: (changes: Partial<Omit<CandidateProfile, 'evidence'>>) => void
  applyResumeDraft: (draft: ResumeDraft) => void
  setResumeText: (text: string) => void
  setResumeDraft: (draft?: ResumeDraft) => void
  addEvidence: (evidence: Evidence) => void
  updateEvidence: (id: string, changes: Partial<Evidence>) => void
  removeEvidence: (id: string) => void
  addJobs: (jobs: Job[]) => void
  toggleJobSelection: (jobId: string) => void
  setFinalReview: (jobId: string, confirmed: boolean) => void
  setDispatch: (jobId: string, dispatch: DispatchRecord) => void
  setAnswer: (jobId: string, question: string, answer: string) => void
  setApplicationStatus: (jobId: string, status: ApplicationStatus) => void
  updateProvider: (changes: Partial<ProviderConfig>) => void
  resetDemo: () => void
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

const browserStorage = () => {
  const candidate = typeof window === 'undefined' ? undefined : window.localStorage
  return candidate && typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function' && typeof candidate.removeItem === 'function'
    ? candidate
    : fallbackStorage
}

const initialState = () => ({
  activeView: 'dashboard' as WorkbenchView,
  trackFilter: 'all' as TrackFilter,
  profile: clone(seedProfile),
  jobs: clone(seedJobs),
  selectedJobId: 'tencent-business-analysis',
  answers: {},
  applications: Object.fromEntries(seedJobs.map((job) => [job.id, 'saved'])) as Record<string, ApplicationStatus>,
  selectedJobIds: [],
  finalReviewJobIds: [],
  dispatches: {},
  resumeText: '',
  resumeDraft: undefined,
  provider: clone(seedProvider),
})

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
      ...initialState(),
      setActiveView: (activeView) => set({ activeView }),
      setTrackFilter: (trackFilter) => set({ trackFilter }),
      selectJob: (selectedJobId) => set({ selectedJobId }),
      updateProfile: (changes) => set((state) => ({ profile: { ...state.profile, ...changes } })),
      applyResumeDraft: (draft) => set((state) => ({
        profile: {
          ...state.profile,
          name: draft.name?.trim() || state.profile.name,
          email: draft.email?.trim() || state.profile.email,
          phone: draft.phone?.trim() || state.profile.phone,
          graduationYear: draft.graduationYear ?? state.profile.graduationYear,
          education: draft.education?.trim() || state.profile.education,
          locationPreference: draft.locationPreference?.filter(Boolean).length ? draft.locationPreference : state.profile.locationPreference,
          evidence: draft.evidence.length ? draft.evidence : state.profile.evidence,
        },
        resumeDraft: undefined,
      })),
      setResumeText: (resumeText) => set({ resumeText }),
      setResumeDraft: (resumeDraft) => set({ resumeDraft }),
      addEvidence: (evidence) => set((state) => ({ profile: { ...state.profile, evidence: [...state.profile.evidence, evidence] } })),
      updateEvidence: (id, changes) => set((state) => ({ profile: { ...state.profile, evidence: state.profile.evidence.map((evidence) => evidence.id === id ? { ...evidence, ...changes } : evidence) } })),
      removeEvidence: (id) => set((state) => ({ profile: { ...state.profile, evidence: state.profile.evidence.filter((evidence) => evidence.id !== id) } })),
      addJobs: (newJobs) => set((state) => {
        const jobsById = new Map(state.jobs.map((job) => [job.id, job]))
        newJobs.forEach((job) => jobsById.set(job.id, job))
        return { jobs: [...jobsById.values()] }
      }),
      toggleJobSelection: (jobId) => set((state) => ({
        selectedJobIds: state.selectedJobIds.includes(jobId) ? state.selectedJobIds.filter((id) => id !== jobId) : [...state.selectedJobIds, jobId],
        dispatches: state.selectedJobIds.includes(jobId) ? state.dispatches : { ...state.dispatches, [jobId]: { stage: 'queued', detail: '已加入本轮投递', updatedAt: new Date().toISOString() } },
      })),
      setFinalReview: (jobId, confirmed) => set((state) => ({
        finalReviewJobIds: confirmed ? [...new Set([...state.finalReviewJobIds, jobId])] : state.finalReviewJobIds.filter((id) => id !== jobId),
      })),
      setDispatch: (jobId, dispatch) => set((state) => ({ dispatches: { ...state.dispatches, [jobId]: dispatch } })),
      setAnswer: (jobId, question, answer) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [jobId]: { ...state.answers[jobId], [question]: answer },
          },
        })),
      setApplicationStatus: (jobId, status) => set((state) => ({ applications: { ...state.applications, [jobId]: status } })),
      updateProvider: (changes) => set((state) => ({ provider: { ...state.provider, ...changes } })),
      resetDemo: () => set(initialState()),
    }),
    {
      name: 'career-application-workbench',
      storage: createJSONStorage(browserStorage),
      partialize: (state) => ({
        activeView: state.activeView,
        trackFilter: state.trackFilter,
        profile: state.profile,
        jobs: state.jobs,
        selectedJobId: state.selectedJobId,
        answers: state.answers,
        applications: state.applications,
        provider: { ...state.provider, apiKey: '', searchApiKey: '' },
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<WorkbenchState>
        return {
          ...currentState,
          ...persisted,
          provider: {
            ...currentState.provider,
            ...persisted.provider,
            apiKey: '',
            searchApiKey: '',
          },
        }
      },
    },
  ),
)
