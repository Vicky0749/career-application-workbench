import { ExternalLink, Filter, MapPin, RefreshCw } from 'lucide-react'

import { rankJob } from '../domain/matching'
import type { CareerTrack } from '../domain/types'
import { useWorkbenchStore } from '../store/workbench-store'

const TODAY = '2026-08-11'
const labels: Record<'all' | CareerTrack, string> = { all: '全部', primary: '主目标', challenge: '挑战', base: '兜底' }

export function JobPool() {
  const { jobs, profile, trackFilter, setTrackFilter, selectedJobId, selectJob, selectedJobIds } = useWorkbenchStore()
  const visibleJobs = jobs
    .filter((job) => trackFilter === 'all' || job.track === trackFilter)
    .map((job) => ({ job, match: rankJob(profile, job, TODAY) }))
    .sort((a, b) => b.match.score - a.match.score)
  const selected = visibleJobs.find(({ job }) => job.id === selectedJobId)?.job ?? visibleJobs[0]?.job
  const selectedMatch = selected ? rankJob(profile, selected, TODAY) : undefined

  return (
    <>
      <header className="page-heading compact">
        <div><p className="page-kicker">官方入口与职位复核</p><h1>岗位池</h1><p className="page-summary">来源日期保留在每条岗位中，超过 5 天未复核的岗位不会进入优先队列。</p></div>
        <button className="button secondary" type="button"><RefreshCw size={17} />重新核验</button>
      </header>
      <div className="toolbar">
        <div className="segmented" aria-label="按赛道筛选">
          {(Object.keys(labels) as Array<'all' | CareerTrack>).map((filter) => (
            <button className={trackFilter === filter ? 'selected' : ''} key={filter} onClick={() => setTrackFilter(filter)} type="button">{filter === 'challenge' ? '挑战' : labels[filter]}</button>
          ))}
        </div>
        <span className="toolbar-note"><Filter size={15} />{visibleJobs.length} 个岗位</span>
      </div>
      <section className="job-layout">
        <div className="job-table panel" role="table" aria-label="岗位列表">
          <div className="job-head" role="row"><span>岗位</span><span>赛道</span><span>匹配</span><span>来源</span></div>
          {visibleJobs.map(({ job, match }) => (
            <button className={selected?.id === job.id ? 'job-row selected' : 'job-row'} key={job.id} onClick={() => selectJob(job.id)} role="row" type="button">
              <span className="job-title"><strong>{job.role}</strong><small>{job.employerLabel} · {job.city}</small></span>
              <span className={`track-tag ${job.track}`}>{labels[job.track]}</span>
              <span className="score"><b>{match.score}</b><small>{match.isStale ? '待复核' : '已匹配'}</small></span>
              <span className="source-cell"><small>{job.sourceConfidence === 'official-live' ? '官网职位页' : '官方入口'}</small><small>{job.capturedAt}</small></span>
            </button>
          ))}
        </div>
        {selected && selectedMatch && <JobDetail isSelected={selectedJobIds.includes(selected.id)} job={selected} score={selectedMatch.score} reasons={selectedMatch.reasons} missing={selectedMatch.missingRequirements} stale={selectedMatch.isStale} />}
      </section>
    </>
  )
}

function JobDetail({ job, score, reasons, missing, stale, isSelected }: { job: ReturnType<typeof useWorkbenchStore.getState>['jobs'][number]; score: number; reasons: string[]; missing: string[]; stale: boolean; isSelected: boolean }) {
  const setActiveView = useWorkbenchStore((state) => state.setActiveView)
  const selectJob = useWorkbenchStore((state) => state.selectJob)
  const toggleJobSelection = useWorkbenchStore((state) => state.toggleJobSelection)

  return (
    <aside className="job-detail panel">
      <div className="detail-top"><div><span className={`track-tag ${job.track}`}>{job.track === 'primary' ? '主目标' : job.track === 'challenge' ? '挑战' : '兜底'}</span><h2>{job.role}</h2><p>{job.employerLabel} · {job.city}</p></div><strong className="big-score">{score}</strong></div>
      <p className="detail-description">{job.description}</p>
      <dl className="detail-facts"><div><dt><MapPin size={15} />工作地点</dt><dd>{job.city}</dd></div><div><dt>适用届别</dt><dd>{job.graduationYears.join('、')} 届</dd></div><div><dt>最近核验</dt><dd>{job.capturedAt}{stale ? ' · 超过 5 天' : ''}</dd></div><div><dt>转正信息</dt><dd>{job.returnOffer === 'confirmed' ? '已明确' : '待职位页确认'}</dd></div></dl>
      <div className="fit-list"><h3>匹配依据</h3>{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
      <div className="gap-list"><h3>需补强或核验</h3>{missing.length ? missing.map((item) => <span key={item}>{item}</span>) : <span>暂无能力缺口</span>}</div>
      <div className="detail-actions"><a className="button secondary" href={job.sourceUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />打开官网</a><button className="button primary" onClick={() => toggleJobSelection(job.id)} type="button">{isSelected ? '移出本轮' : '加入本轮'}</button></div><button className="link-button review-link" onClick={() => { selectJob(job.id); setActiveView('review') }} type="button">进入审核与投递编排</button>
    </aside>
  )
}
