import { ArrowUpRight, ClipboardCheck, ShieldCheck, Sparkles } from 'lucide-react'

import { rankJob } from '../domain/matching'
import { evaluateReview } from '../domain/review'
import { useWorkbenchStore } from '../store/workbench-store'

const TODAY = '2026-08-11'

export function Dashboard() {
  const { jobs, profile, answers, setActiveView, selectJob } = useWorkbenchStore()
  const scored = jobs.map((job) => ({ job, match: rankJob(profile, job, TODAY), review: evaluateReview(profile, job, answers[job.id] ?? {}) }))
  const ready = scored.filter((item) => item.review.status === 'ready_to_prefill').length
  const needsReview = scored.filter((item) => item.review.status === 'review_required').length
  const current = scored.filter((item) => !item.match.isStale && item.job.graduationYears.includes(profile.graduationYear)).length
  const recommended = scored.filter((item) => !item.match.isStale).sort((a, b) => b.match.score - a.match.score).slice(0, 3)

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="page-kicker">2028 校招与暑期转正</p>
          <h1>把投递变成可核验的队列</h1>
          <p className="page-summary">围绕商业分析、策略运营、咨询与商业财务四类可迁移能力，先筛岗，再审核，最后打开官网预填。</p>
        </div>
        <button className="button secondary" onClick={() => setActiveView('jobs')} type="button"><ArrowUpRight size={17} />查看岗位池</button>
      </header>
      <section className="metrics" aria-label="投递进度">
        <article className="metric"><div className="metric-icon teal"><BriefcaseBusinessIcon /></div><span>符合届别且未过期</span><strong>{current}</strong><small>三个官网来源</small></article>
        <article className="metric"><div className="metric-icon amber"><ClipboardCheck size={19} /></div><span>待人工审核</span><strong>{needsReview}</strong><small>缺少事实或筛选答案</small></article>
        <article className="metric"><div className="metric-icon green"><ShieldCheck size={19} /></div><span>可启动预填</span><strong>{ready}</strong><small>不等同于已提交</small></article>
      </section>
      <section className="panel recommendation-panel">
        <div className="section-heading"><div><span className="section-eyebrow"><Sparkles size={15} />今日优先处理</span><h2>按匹配度排序</h2></div><button className="link-button" onClick={() => setActiveView('review')} type="button">去审核队列</button></div>
        <div className="recommendation-list">
          {recommended.map(({ job, match, review }) => (
            <button className="recommendation-row" key={job.id} onClick={() => { selectJob(job.id); setActiveView('jobs') }} type="button">
              <div className="company-badge">{job.employerLabel.slice(0, 1)}</div>
              <div className="row-main"><strong>{job.role}</strong><span>{job.employerLabel} · {job.city} · {job.jobType === 'internship' ? '实习' : '校招'}</span></div>
              <div className="row-meta"><strong>{match.score}</strong><span className={`status ${review.status}`}>{review.status === 'ready_to_prefill' ? '预填就绪' : '需审核'}</span></div>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function BriefcaseBusinessIcon() {
  return <Sparkles size={19} />
}
