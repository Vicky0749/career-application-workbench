import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { seedJobs, seedProfile, seedProvider } from '../domain/seed'
import type { ApplicationStatus, CandidateProfile, CareerTrack, Job, ProviderConfig } from '../domain/types'

export type WorkbenchView = 'dashboard' | 'jobs' | 'review' | 'profile' | 'settings'
export type TrackFilter = 'all' | CareerTrack

interface WorkbenchState {
  activeView: WorkbenchView
  trackFilter: TrackFilter
  profile: CandidateProfile
  jobs: Job[]
  selectedJobId: string
  answers: Record<string, Record<string, string>>
  applications: Record<string, ApplicationStatus>
  provider: ProviderConfig
  setActiveView: (view: WorkbenchView) => void
  setTrackFilter: (filter: TrackFilter) => void
  selectJob: (jobId: string) => void
  updateProfile: (changes: Partial<Pick<CandidateProfile, 'name' | 'email' | 'phone' | 'education' | 'resumeFileName'>>) => void
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
        provider: { ...state.provider, apiKey: '' },
      }),
    },
  ),
)
