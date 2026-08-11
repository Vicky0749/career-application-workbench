import { CircleAlert, ExternalLink, ShieldCheck } from 'lucide-react'

import { evaluateReview } from '../domain/review'
import { useWorkbenchStore } from '../store/workbench-store'

export function ReviewQueue() {
  const { jobs, profile, answers, setAnswer, setActiveView, selectJob } = useWorkbenchStore()
  const reviewItems = jobs.filter((job) => job.id === 'pwc-transaction-services' || job.id === 'tencent-business-analysis')

  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">提交前的事实核验</p><h1>审核队列</h1><p className="page-summary">只有来源、届别、个人事实和筛选回答全部明确的岗位，才会显示为预填就绪。</p></div></header>
      <div className="review-grid">
        {reviewItems.map((job) => {
          const result = evaluateReview(profile, job, answers[job.id] ?? {})
          const isReady = result.status === 'ready_to_prefill'
          return (
            <article className="review-item panel" key={job.id}>
              <div className="review-header"><div><span className={`status ${result.status}`}>{isReady ? '预填就绪' : '需要审核'}</span><h2>{job.role}</h2><p>{job.employerLabel} · {job.city}</p></div>{isReady ? <ShieldCheck className="ready-icon" size={27} /> : <CircleAlert className="alert-icon" size={27} />}</div>
              {result.blockers.length > 0 && <ul className="blocker-list">{result.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
              {job.screeningQuestions.map((question) => <label className="field" key={question}>{question}<input aria-label={question} onChange={(event) => setAnswer(job.id, question, event.target.value)} placeholder="由本人确认后填写" value={answers[job.id]?.[question] ?? ''} /></label>)}
              {isReady && <p className="review-ready-note">仍需在官网完成最终提交</p>}
              <div className="review-actions"><a className="button secondary" href={job.sourceUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />打开官网复核</a><button className="button primary" disabled={!isReady} onClick={() => { selectJob(job.id); setActiveView('jobs') }} type="button">启动预填计划</button></div>
            </article>
          )
        })}
      </div>
    </>
  )
}
