import type { ApplicationTarget, CandidateProfile, DispatchRecord, Job, PageInspection } from '../domain/types'

export interface ExtensionBatchItem {
  job: Pick<Job, 'id' | 'employer' | 'role' | 'sourceUrl'>
  profile: Pick<CandidateProfile, 'name' | 'email' | 'phone' | 'education' | 'resumeFileName'>
}

export interface ExtensionBatchResult {
  jobs: Array<{ jobId: string; record: DispatchRecord }>
}

export interface ExtensionInspectionResult {
  targets: Array<{ targetId: string; status: 'inspected' | 'failed'; inspection?: PageInspection; error?: string }>
}

type ExtensionEvent<T> = CustomEvent<{ requestId: string; payload?: T; error?: string }>

const eventName = 'career-workbench-extension-result'

function sendExtensionRequest<T>(type: 'run-batch' | 'submit-batch' | 'inspect-targets', items: unknown[]): Promise<T> {
  if (typeof window === 'undefined') return Promise.reject(new Error('浏览器扩展桥接只可在网页中使用'))
  const requestId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(eventName, listener)
      reject(new Error('未收到扩展响应。请确认已加载扩展，并从本地工作台页面发起操作。'))
    }, 45_000)
    const listener = (event: Event) => {
      const detail = (event as ExtensionEvent<T>).detail
      if (!detail || detail.requestId !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener(eventName, listener)
      if (detail.error) reject(new Error(detail.error))
      else resolve(detail.payload as T)
    }
    window.addEventListener(eventName, listener)
    window.dispatchEvent(new CustomEvent('career-workbench-extension', { detail: { requestId, type, items } }))
  })
}

export function sendExtensionBatch(type: 'run-batch' | 'submit-batch', items: ExtensionBatchItem[]): Promise<ExtensionBatchResult> {
  return sendExtensionRequest<ExtensionBatchResult>(type, items)
}

export function inspectExtensionTargets(targets: Array<Pick<ApplicationTarget, 'id' | 'sourceUrl' | 'targetRole'>>): Promise<ExtensionInspectionResult> {
  return sendExtensionRequest<ExtensionInspectionResult>('inspect-targets', targets)
}
