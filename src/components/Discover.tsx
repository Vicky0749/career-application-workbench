import { Bot, CheckCircle2, FileUp, ListPlus, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { discoverOfficialJobs } from '../services/discovery'
import { draftFromPlainText, parseResumeWithProvider, readResumeFile } from '../services/resume'
import { useWorkbenchStore } from '../store/workbench-store'

export function Discover() {
  const { profile, provider, resumeText, resumeDraft, setResumeText, setResumeDraft, applyResumeDraft, updateProfile, addJobs, setActiveView } = useWorkbenchStore()
  const [busy, setBusy] = useState<'file' | 'parse' | 'search' | undefined>()
  const [notice, setNotice] = useState('')

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

  return (
    <>
      <header className="page-heading compact">
        <div><p className="page-kicker">简历解析与官方岗位发现</p><h1>导入与发现</h1><p className="page-summary">先把简历与经历转换成待确认事实，再用搜索接口抓取三家官网的岗位线索。模型和搜索接口都在本机配置。</p></div>
      </header>
      <section className="discover-grid">
        <article className="panel intake-panel">
          <div className="section-heading"><div><h2><FileUp size={19} />简历输入</h2><p>支持 TXT、Markdown 和 DOCX。文件内容只在当前浏览器页面处理。</p></div></div>
          <label className="upload-control">选择简历文件<input accept=".docx,.txt,.md,text/plain,text/markdown" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} type="file" /></label>
          <label className="field">或直接粘贴简历正文<textarea onChange={(event) => setResumeText(event.target.value)} placeholder="粘贴简历中的教育、经历和项目描述..." value={resumeText} /></label>
          <div className="inline-actions"><button className="button secondary" disabled={!resumeText.trim() || busy !== undefined} onClick={() => setResumeDraft(draftFromPlainText(resumeText))} type="button"><Sparkles size={16} />快速提取</button><button className="button primary" disabled={!resumeText.trim() || busy !== undefined} onClick={() => void parseWithAi()} type="button"><Bot size={16} />{busy === 'parse' ? '正在解析' : 'AI 生成草稿'}</button></div>
        </article>
        <article className="panel discovery-panel">
          <div className="section-heading"><div><h2><Search size={19} />官方岗位发现</h2><p>生成华为、腾讯与 PwC 中国官网域名限定查询，并归一化搜索接口返回的职位链接。</p></div></div>
          <div className="discovery-sources"><span>华为 career.huawei.com</span><span>腾讯 join.qq.com</span><span>PwC 中国 www.pwccn.com</span></div>
          <p className="quiet-note">当前目标：{profile.graduationYear} 届 · {profile.locationPreference.join('、')}。搜索 API 需在 AI 配置页填写。</p>
          <div className="inline-actions"><button className="button primary" disabled={busy !== undefined} onClick={() => void searchOfficialJobs()} type="button"><Search size={16} />{busy === 'search' ? '正在发现' : '自动发现岗位'}</button><button className="button secondary" onClick={() => setActiveView('jobs')} type="button"><ListPlus size={16} />查看岗位池</button></div>
        </article>
      </section>
      {notice && <p className="notice" role="status">{notice}</p>}
      {resumeDraft && <section className="panel draft-panel"><div className="section-heading"><div><p className="section-eyebrow">待确认草稿</p><h2>简历提取结果</h2><p>只会在你确认后写入档案与经历证据池。</p></div><CheckCircle2 size={22} /></div><div className="draft-facts"><span>姓名：{resumeDraft.name || '未提取'}</span><span>邮箱：{resumeDraft.email || '未提取'}</span><span>电话：{resumeDraft.phone || '未提取'}</span><span>毕业届别：{resumeDraft.graduationYear ? `${resumeDraft.graduationYear} 届` : '未提取'}</span><span>教育：{resumeDraft.education || '未提取'}</span></div><div className="draft-evidence"><h3>经历草稿</h3>{resumeDraft.evidence.length ? resumeDraft.evidence.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.organization} · {item.period}</span><p>{item.summary || '无摘要'}</p></article>) : <p>尚未提取经历，请在档案与证据页手动补充，或配置模型后重新解析。</p>}</div><div className="inline-actions"><button className="button primary" onClick={() => { applyResumeDraft(resumeDraft); setNotice('档案草稿已写入本地档案；AI 提取的经历仍标记为待核验。') }} type="button">确认写入档案</button><button className="button secondary" onClick={() => setResumeDraft(undefined)} type="button">舍弃草稿</button></div></section>}
    </>
  )
}
