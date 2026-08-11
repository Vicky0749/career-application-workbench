import { CheckCircle2, CircleAlert, ExternalLink, Send, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { evaluateReview } from '../domain/review'
import type { DispatchStage, Job } from '../domain/types'
import { sendExtensionBatch, type ExtensionBatchItem } from '../services/extension-bridge'
import { useWorkbenchStore } from '../store/workbench-store'

const dispatchLabel: Record<DispatchStage, string> = {
  not_selected: '未选择',
  queued: '已加入本轮',
  prefilled: '已预填，待最终审核',
  needs_manual: '需人工处理',
  sending: '正在发送',
  sent: '已发送',
  failed: '发送失败',
}

export function ReviewQueue() {
  const { jobs, profile, answers, setAnswer, selectedJobIds, toggleJobSelection, finalReviewJobIds, setFinalReview, dispatches, setDispatch, setApplicationStatus } = useWorkbenchStore()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<'prefill' | 'submit' | undefined>()
  const reviewItems = jobs.filter((job) => job.jobType === 'internship' && job.graduationYears.includes(profile.graduationYear))
  const readiness = useMemo(() => Object.fromEntries(reviewItems.map((job) => [job.id, evaluateReview(profile, job, answers[job.id] ?? {})])), [answers, profile, reviewItems])
  const selectedReady = reviewItems.filter((job) => selectedJobIds.includes(job.id) && readiness[job.id].status === 'ready_to_prefill')
  const prefilled = selectedReady.filter((job) => dispatches[job.id]?.stage === 'prefilled')
  const allFinalReviewed = prefilled.length > 0 && prefilled.every((job) => finalReviewJobIds.includes(job.id))

  const extensionItems = (items: Job[]): ExtensionBatchItem[] => items.map((job) => ({
    job: { id: job.id, employer: job.employer, role: job.role, sourceUrl: job.sourceUrl },
    profile: { name: profile.name, email: profile.email, phone: profile.phone, education: profile.education, resumeFileName: profile.resumeFileName },
  }))

  const prefill = async (items: Job[]) => {
    if (!items.length) return
    setBusy('prefill')
    setNotice('')
    const now = new Date().toISOString()
    items.forEach((job) => setDispatch(job.id, { stage: 'queued', detail: '正在打开官网职位页', updatedAt: now }))
    try {
      const result = await sendExtensionBatch('run-batch', extensionItems(items))
      const returned = new Set(result.jobs.map(({ jobId }) => jobId))
      result.jobs.forEach(({ jobId, record }) => setDispatch(jobId, record))
      items.filter((job) => !returned.has(job.id)).forEach((job) => setDispatch(job.id, { stage: 'needs_manual', detail: '扩展未返回该岗位的审计结果', updatedAt: new Date().toISOString() }))
      setNotice('预填请求已完成。请逐个检查官网标签页中的内容，再勾选最终审核。')
    } catch (error) {
      const detail = error instanceof Error ? error.message : '扩展预填失败'
      items.forEach((job) => setDispatch(job.id, { stage: 'failed', detail, updatedAt: new Date().toISOString() }))
      setNotice(detail)
    } finally {
      setBusy(undefined)
    }
  }

  const submit = async () => {
    if (!allFinalReviewed || !window.confirm(`确认发送 ${prefilled.length} 个已审核岗位？扩展会仅尝试提交本轮已预填且已勾选审核的官网标签页。`)) return
    setBusy('submit')
    setNotice('')
    prefilled.forEach((job) => setDispatch(job.id, { stage: 'sending', detail: '正在请求官网提交', updatedAt: new Date().toISOString(), tabId: dispatches[job.id]?.tabId }))
    try {
      const result = await sendExtensionBatch('submit-batch', extensionItems(prefilled))
      result.jobs.forEach(({ jobId, record }) => {
        setDispatch(jobId, record)
        if (record.stage === 'sent') setApplicationStatus(jobId, 'applied')
      })
      setNotice('发送请求已返回。对需要人工处理的岗位，请回到对应官网标签页查看原因。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '批量发送失败')
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">提交前的事实核验</p><h1>审核与批量投递</h1><p className="page-summary">选择岗位、确认筛选题、预填官网页面，再逐项勾选最终审核。只有这些步骤都完成后，才可发起本轮批量发送。</p></div></header>
      <section className="batch-toolbar panel"><div><strong>本轮已选 {selectedJobIds.length} 个</strong><span>可预填 {selectedReady.length} 个 · 已完成官网预填 {prefilled.length} 个</span></div><div className="inline-actions"><button className="button secondary" disabled={!selectedReady.length || busy !== undefined} onClick={() => void prefill(selectedReady)} type="button"><ShieldCheck size={16} />{busy === 'prefill' ? '正在预填' : `批量预填 ${selectedReady.length} 个`}</button><button className="button primary" disabled={!allFinalReviewed || busy !== undefined} onClick={() => void submit()} type="button"><Send size={16} />{busy === 'submit' ? '正在发送' : `一键发送 ${prefilled.length} 个`}</button></div></section>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="review-grid">
        {reviewItems.map((job) => {
          const result = readiness[job.id]
          const isReady = result.status === 'ready_to_prefill'
          const isSelected = selectedJobIds.includes(job.id)
          const dispatch = dispatches[job.id]
          const prefilledHere = dispatch?.stage === 'prefilled'
          return (
            <article className="review-item panel" key={job.id}>
              <div className="review-header"><div><span className={`status ${isReady ? 'ready_to_prefill' : 'review_required'}`}>{isReady ? '预填就绪' : '需要审核'}</span><h2>{job.role}</h2><p>{job.employerLabel} · {job.city}</p></div>{isReady ? <ShieldCheck className="ready-icon" size={27} /> : <CircleAlert className="alert-icon" size={27} />}</div>
              <label className="selection-toggle"><input checked={isSelected} onChange={() => toggleJobSelection(job.id)} type="checkbox" />纳入本轮投递</label>
              {result.blockers.length > 0 && <ul className="blocker-list">{result.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
              {job.screeningQuestions.map((question) => <label className="field" key={question}>{question}<input aria-label={question} onChange={(event) => setAnswer(job.id, question, event.target.value)} placeholder="由本人确认后填写" value={answers[job.id]?.[question] ?? ''} /></label>)}
              {dispatch && <p className={`dispatch-note ${dispatch.stage}`}>{dispatchLabel[dispatch.stage]}：{dispatch.detail}</p>}
              {prefilledHere && <label className="selection-toggle final-review"><input checked={finalReviewJobIds.includes(job.id)} onChange={(event) => setFinalReview(job.id, event.target.checked)} type="checkbox" />我已在官网完成该岗位的最终审核</label>}
              <div className="review-actions"><a className="button secondary" href={job.sourceUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />打开官网</a><button className="button primary" disabled={!isReady || busy !== undefined} onClick={() => void prefill([job])} type="button"><CheckCircle2 size={16} />启动预填</button></div>
            </article>
          )
        })}
      </div>
    </>
  )
}
