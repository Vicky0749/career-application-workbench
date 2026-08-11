import type { CandidateProfile, DispatchRecord, Job } from '../domain/types'

export interface ExtensionBatchItem {
  job: Pick<Job, 'id' | 'employer' | 'role' | 'sourceUrl'>
  profile: Pick<CandidateProfile, 'name' | 'email' | 'phone' | 'education' | 'resumeFileName'>
}

export interface ExtensionBatchResult {
  jobs: Array<{ jobId: string; record: DispatchRecord }>
}

type ExtensionEvent = CustomEvent<{ requestId: string; payload?: ExtensionBatchResult; error?: string }>

const eventName = 'career-workbench-extension-result'

export function sendExtensionBatch(type: 'run-batch' | 'submit-batch', items: ExtensionBatchItem[]): Promise<ExtensionBatchResult> {
  if (typeof window === 'undefined') return Promise.reject(new Error('浏览器扩展桥接只可在网页中使用'))
  const requestId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(eventName, listener)
      reject(new Error('未收到扩展响应。请确认已加载扩展，并从本地工作台页面发起操作。'))
    }, 45_000)
    const listener = (event: Event) => {
      const detail = (event as ExtensionEvent).detail
      if (!detail || detail.requestId !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener(eventName, listener)
      if (detail.error) reject(new Error(detail.error))
      else resolve(detail.payload ?? { jobs: [] })
    }
    window.addEventListener(eventName, listener)
    window.dispatchEvent(new CustomEvent('career-workbench-extension', { detail: { requestId, type, items } }))
  })
}
