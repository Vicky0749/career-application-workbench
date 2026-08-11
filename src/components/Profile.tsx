import { CheckCircle2, FileCheck2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { Evidence } from '../domain/types'
import { useWorkbenchStore } from '../store/workbench-store'

const emptyEvidence = (): Omit<Evidence, 'id'> => ({ title: '', organization: '', period: '', summary: '', skills: [], sourceNote: '本人手动录入', verified: false })

export function Profile() {
  const { profile, updateProfile, addEvidence, updateEvidence, removeEvidence } = useWorkbenchStore()
  const [draft, setDraft] = useState(emptyEvidence)
  const [skillsText, setSkillsText] = useState('')

  const saveEvidence = () => {
    if (!draft.title.trim()) return
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `evidence-${Date.now()}`
    addEvidence({ ...draft, id, title: draft.title.trim(), organization: draft.organization.trim() || '待确认', period: draft.period.trim() || '待确认', skills: skillsText.split(/[，,]/).map((skill) => skill.trim()).filter(Boolean) })
    setDraft(emptyEvidence())
    setSkillsText('')
  }

  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">简历与经历的事实边界</p><h1>档案与证据</h1><p className="page-summary">只保存可核验的经历。导入或 AI 提取的内容先标记为待核验，确认后才会参与岗位匹配与预填。</p></div></header>
      <section className="profile-layout">
        <form className="panel profile-form" onSubmit={(event) => event.preventDefault()}>
          <div className="section-heading"><div><h2>申请基础信息</h2><p>这些字段会在审核时检查完整性。</p></div><span className="autosave">本地保存</span></div>
          <div className="form-grid">
            <label className="field">姓名<input onChange={(event) => updateProfile({ name: event.target.value })} value={profile.name} /></label>
            <label className="field">联系电话<input inputMode="tel" onChange={(event) => updateProfile({ phone: event.target.value })} placeholder="请填写本人电话" value={profile.phone} /></label>
            <label className="field">邮箱<input onChange={(event) => updateProfile({ email: event.target.value })} placeholder="请填写本人邮箱" type="email" value={profile.email} /></label>
            <label className="field">毕业届别<input min="2020" max="2040" onChange={(event) => updateProfile({ graduationYear: Number(event.target.value) || profile.graduationYear })} type="number" value={profile.graduationYear} /></label>
            <label className="field full">教育经历<input onChange={(event) => updateProfile({ education: event.target.value })} value={profile.education} /></label>
            <label className="field full">当前简历文件<input onChange={(event) => updateProfile({ resumeFileName: event.target.value })} value={profile.resumeFileName} /></label>
          </div>
        </form>
        <section className="panel evidence-panel"><div className="section-heading"><div><h2>经历证据池</h2><p>{profile.evidence.filter((item) => item.verified).length} 条已验证事实，{profile.evidence.filter((item) => !item.verified).length} 条待确认</p></div><FileCheck2 size={21} /></div><div className="evidence-list">{profile.evidence.map((item) => <article className="evidence-row" key={item.id}><div><strong>{item.title}</strong><span>{item.organization} · {item.period}</span><p>{item.summary}</p><div className="skill-list">{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><label className="verify-toggle"><input checked={item.verified} onChange={(event) => updateEvidence(item.id, { verified: event.target.checked })} type="checkbox" />已由本人核验</label></div><div className="evidence-tools">{item.verified && <CheckCircle2 className="verified" size={19} />}<button aria-label={`删除 ${item.title}`} className="icon-button" onClick={() => removeEvidence(item.id)} type="button"><Trash2 size={15} /></button></div></article>)}</div><form className="evidence-editor" onSubmit={(event) => { event.preventDefault(); saveEvidence() }}><h3><Plus size={16} />加入经历</h3><div className="form-grid"><label className="field">经历名称<input onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} /></label><label className="field">组织/公司<input onChange={(event) => setDraft({ ...draft, organization: event.target.value })} value={draft.organization} /></label><label className="field">时间<input onChange={(event) => setDraft({ ...draft, period: event.target.value })} placeholder="例如 2026.06-2026.08" value={draft.period} /></label><label className="field">能力标签<input onChange={(event) => setSkillsText(event.target.value)} placeholder="逗号分隔" value={skillsText} /></label><label className="field full">事实描述<textarea onChange={(event) => setDraft({ ...draft, summary: event.target.value })} value={draft.summary} /></label></div><button className="button secondary" type="submit"><Plus size={16} />添加到证据池</button></form></section>
      </section>
    </>
  )
}
