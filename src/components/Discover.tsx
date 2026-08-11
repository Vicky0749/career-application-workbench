import { Bot, CheckCircle2, CircleAlert, FileUp, Link2, ListPlus, ScanSearch, Search, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { analyzeApplicationEntries } from '../services/entry-analysis'
import { discoverOfficialJobs } from '../services/discovery'
import { inspectExtensionTargets } from '../services/extension-bridge'
import { draftFromPlainText, parseResumeWithProvider, readResumeFile } from '../services/resume'
import { parseApplicationTargets, targetToJob } from '../services/target-import'
import { useWorkbenchStore } from '../store/workbench-store'

const targetStatusLabel = {
  imported: '等待检查',
  inspected: '已读取页面',
  analyzed: '入口待审核',
  needs_review: '待审核',
  confirmed: '已加入岗位池',
  failed: '需人工处理',
} as const

export function Discover() {
  const {
    profile, provider, resumeText, resumeDraft, applicationTargets, setResumeText, setResumeDraft, applyResumeDraft, updateProfile, addJobs, setActiveView,
    addApplicationTargets, setTargetInspection, setTargetAnalyses, updateTargetAnalysis, setTargetError, confirmApplicationTarget, removeApplicationTarget,
  } = useWorkbenchStore()
  const [busy, setBusy] = useState<'file' | 'parse' | 'search' | 'targets' | undefined>()
  const [notice, setNotice] = useState('')
  const [targetInput, setTargetInput] = useState('')

  const importFile = async (file: File) => {
    setBusy('file')
    setNotice('')
    try {
      const text = await readResumeFile(file)
      setResumeText(text)
      updateProfile({ resumeFileName: file.name })
      setResumeDraft(draftFromPlainText(text))
      setNotice(`已读取 ${file.name}，可先查看文本，再用 AI 生成档案草稿。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '简历读取失败')
    } finally {
      setBusy(undefined)
    }
  }

  const parseWithAi = async () => {
    setBusy('parse')
    setNotice('')
    try {
      setResumeDraft(await parseResumeWithProvider(resumeText, provider))
      setNotice('AI 已生成待审核档案草稿，确认前不会覆盖当前档案。')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '简历解析失败')
    } finally {
      setBusy(undefined)
    }
  }

  const searchOfficialJobs = async () => {
    setBusy('search')
    setNotice('')
    try {
      const jobs = await discoverOfficialJobs(profile, provider)
      addJobs(jobs)
      setNotice(`已从官网域名线索中导入 ${jobs.length} 个岗位，仍需在官网职位页复核。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '岗位发现失败')
    } finally {
      setBusy(undefined)
    }
  }

  const importTargets = () => {
    const { targets, errors } = parseApplicationTargets(targetInput)
    if (targets.length) addApplicationTargets(targets)
    setNotice(targets.length ? `已导入 ${targets.length} 个网站目标${errors.length ? `；${errors.length} 行未导入` : ''}。` : errors.join('；') || '请先输入网站与职位目标')
    if (targets.length) setTargetInput('')
  }

  const importTargetFile = async (file: File) => {
    try {
      setTargetInput(await file.text())
      setNotice(`已读取 ${file.name}，请确认格式后导入。`)
    } catch {
      setNotice('无法读取该网址清单文件')
    }
  }

  const inspectTargets = async () => {
    const targets = applicationTargets.filter((target) => target.status === 'imported' || target.status === 'failed')
    if (!targets.length) {
      setNotice('没有等待检查的网站目标')
      return
    }
    setBusy('targets')
    setNotice('')
    try {
      const inspected = await inspectExtensionTargets(targets)
      const modelInputs = []
      for (const result of inspected.targets) {
        const target = targets.find((item) => item.id === result.targetId)
        if (!target) continue
        if (result.inspection) {
          setTargetInspection(target.id, result.inspection)
          modelInputs.push({ targetId: target.id, sourceUrl: target.sourceUrl, targetRole: target.targetRole, inspection: result.inspection })
        } else {
          setTargetError(target.id, result.error || '未读取到页面内容')
        }
      }
      if (!modelInputs.length) throw new Error('没有可交给模型分析的页面，请确认扩展已加载并授权这些域名')
      setTargetAnalyses(await analyzeApplicationEntries(modelInputs, provider))
      setNotice(`已读取并分析 ${modelInputs.length} 个招聘网站，请审核推荐入口后加入岗位池。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '入口检测失败')
    } finally {
      setBusy(undefined)
    }
  }

  const confirmTarget = (targetId: string) => {
    const target = applicationTargets.find((item) => item.id === targetId)
    if (!target?.analysis) return
    try {
      const job = targetToJob(target, profile.graduationYear)
      addJobs([job])
      confirmApplicationTarget(target.id, job.id)
      setNotice(`${target.targetRole} 已加入岗位池，可进入审核队列。`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '入口确认失败')
    }
  }

  return (
    <>
      <header className="page-heading compact">
        <div><p className="page-kicker">简历、岗位与官网入口发现</p><h1>导入与发现</h1><p className="page-summary">导入简历、三家预置官网，或一次性粘贴任意招聘网站和职位目标。模型建议申请入口，确认后再进入统一投递队列。</p></div>
      </header>
      <section className="discover-grid">
        <article className="panel intake-panel">
          <div className="section-heading"><div><h2><FileUp size={19} />简历输入</h2><p>支持 TXT、Markdown 和 DOCX。文件内容只在当前浏览器页面处理。</p></div></div>
          <label className="upload-control">选择简历文件<input accept=".docx,.txt,.md,text/plain,text/markdown" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} type="file" /></label>
          <label className="field">或直接粘贴简历正文<textarea onChange={(event) => setResumeText(event.target.value)} placeholder="粘贴简历中的教育、经历和项目描述..." value={resumeText} /></label>
          <div className="inline-actions"><button className="button secondary" disabled={!resumeText.trim() || busy !== undefined} onClick={() => setResumeDraft(draftFromPlainText(resumeText))} type="button"><Sparkles size={16} />快速提取</button><button className="button primary" disabled={!resumeText.trim() || busy !== undefined} onClick={() => void parseWithAi()} type="button"><Bot size={16} />{busy === 'parse' ? '正在解析' : 'AI 生成草稿'}</button></div>
        </article>
        <article className="panel discovery-panel">
          <div className="section-heading"><div><h2><Search size={19} />预置官网岗位发现</h2><p>生成华为、腾讯与 PwC 中国官网域名限定查询，并归一化搜索接口返回的职位链接。</p></div></div>
          <div className="discovery-sources"><span>华为 career.huawei.com</span><span>腾讯 join.qq.com</span><span>PwC 中国 www.pwccn.com</span></div>
          <p className="quiet-note">当前目标：{profile.graduationYear} 届 · {profile.locationPreference.join('、')}。搜索 API 需在 AI 配置页填写。</p>
          <div className="inline-actions"><button className="button primary" disabled={busy !== undefined} onClick={() => void searchOfficialJobs()} type="button"><Search size={16} />{busy === 'search' ? '正在发现' : '自动发现岗位'}</button><button className="button secondary" onClick={() => setActiveView('jobs')} type="button"><ListPlus size={16} />查看岗位池</button></div>
        </article>
      </section>
      <section className="panel target-intake-panel"><div className="section-heading"><div><p className="section-eyebrow">任意招聘官网</p><h2><Link2 size={19} />批量网站与职位目标</h2><p>每行填写 `招聘官网 URL, 职位目标`，也可导入 TXT 或 CSV。扩展会在本轮检查时请求这些网站的访问授权。</p></div><span className="target-count">{applicationTargets.length} 个目标</span></div><label className="field">网址与职位清单<textarea onChange={(event) => setTargetInput(event.target.value)} placeholder={'https://careers.example.com, 战略运营实习生\nhttps://jobs.example.org, 商业分析实习生'} value={targetInput} /></label><div className="inline-actions"><label className="button secondary">导入 TXT/CSV<input accept=".txt,.csv,text/plain,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTargetFile(file) }} type="file" /></label><button className="button secondary" disabled={!targetInput.trim() || busy !== undefined} onClick={importTargets} type="button"><Link2 size={16} />导入网站目标</button><button className="button primary" disabled={!applicationTargets.some((target) => target.status === 'imported' || target.status === 'failed') || busy !== undefined} onClick={() => void inspectTargets()} type="button"><ScanSearch size={16} />{busy === 'targets' ? '正在检测入口' : '检测申请入口'}</button></div></section>
      {notice && <p className="notice" role="status">{notice}</p>}
      {applicationTargets.length > 0 && <section className="target-review-list"><div className="section-heading"><div><h2>候选申请入口</h2><p>模型建议必须经过你确认，才会成为可投递岗位。</p></div></div>{applicationTargets.map((target) => <article className="panel target-review-card" key={target.id}><div><span className={`status target-${target.status}`}>{targetStatusLabel[target.status]}</span><h3>{target.targetRole}</h3><a href={target.sourceUrl} rel="noreferrer" target="_blank">{target.sourceUrl}</a></div>{target.analysis ? <div className="entry-suggestion"><strong>{target.analysis.companyName}</strong><a href={target.analysis.applicationUrl} rel="noreferrer" target="_blank">推荐入口：{target.analysis.applicationUrl}</a><p>{target.analysis.reason}</p><span>置信度 {target.analysis.confidence}%{target.analysis.detectedAts ? ` · ${target.analysis.detectedAts}` : ''}</span>{target.analysis.warnings.length > 0 && <ul>{target.analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</div> : <p className="target-muted">{target.error || target.inspection ? '页面已读取，等待模型建议。' : '等待页面检查。'}</p>}<div className="target-actions">{target.analysis && target.status !== 'confirmed' && <button className="button primary" onClick={() => confirmTarget(target.id)} type="button"><CheckCircle2 size={16} />确认加入岗位池</button>}{target.status === 'confirmed' && <button className="button secondary" onClick={() => setActiveView('jobs')} type="button">查看已加入岗位</button>}{target.status === 'failed' && <CircleAlert size={19} />}</div></article>)}</section>}
      {applicationTargets.some((target) => target.analysis && target.status !== 'confirmed') && <section className="panel target-editor"><div className="section-heading"><div><h2>修订推荐入口</h2><p>可直接改正模型建议的申请页链接，再确认加入岗位池。</p></div></div>{applicationTargets.filter((target) => target.analysis && target.status !== 'confirmed').map((target) => <div className="target-editor-row" key={target.id}><strong>{target.targetRole}</strong><label className="field">申请入口<input onChange={(event) => updateTargetAnalysis(target.id, { applicationUrl: event.target.value })} value={target.analysis?.applicationUrl ?? ''} /></label><button aria-label={`移除 ${target.targetRole}`} className="icon-button" onClick={() => removeApplicationTarget(target.id)} type="button"><Trash2 size={16} /></button></div>)}</section>}
      {resumeDraft && <section className="panel draft-panel"><div className="section-heading"><div><p className="section-eyebrow">待确认草稿</p><h2>简历提取结果</h2><p>只会在你确认后写入档案与经历证据池。</p></div><CheckCircle2 size={22} /></div><div className="draft-facts"><span>姓名：{resumeDraft.name || '未提取'}</span><span>邮箱：{resumeDraft.email || '未提取'}</span><span>电话：{resumeDraft.phone || '未提取'}</span><span>毕业届别：{resumeDraft.graduationYear ? `${resumeDraft.graduationYear} 届` : '未提取'}</span><span>教育：{resumeDraft.education || '未提取'}</span></div><div className="draft-evidence"><h3>经历草稿</h3>{resumeDraft.evidence.length ? resumeDraft.evidence.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.organization} · {item.period}</span><p>{item.summary || '无摘要'}</p></article>) : <p>尚未提取经历，请在档案与证据页手动补充，或配置模型后重新解析。</p>}</div><div className="inline-actions"><button className="button primary" onClick={() => { applyResumeDraft(resumeDraft); setNotice('档案草稿已写入本地档案；AI 提取的经历仍标记为待核验。') }} type="button">确认写入档案</button><button className="button secondary" onClick={() => setResumeDraft(undefined)} type="button">舍弃草稿</button></div></section>}
    </>
  )
}
