import { CheckCircle2, FileCheck2 } from 'lucide-react'

import { useWorkbenchStore } from '../store/workbench-store'

export function Profile() {
  const { profile, updateProfile } = useWorkbenchStore()
  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">简历与经历的事实边界</p><h1>档案与证据</h1><p className="page-summary">只保存可核验的经历。SQL、指标体系、A/B 实验和 BI 是待补强项，不会被写进申请材料。</p></div></header>
      <section className="profile-layout">
        <form className="panel profile-form" onSubmit={(event) => event.preventDefault()}>
          <div className="section-heading"><div><h2>申请基础信息</h2><p>这些字段会在审核时检查完整性。</p></div><span className="autosave">本地保存</span></div>
          <div className="form-grid">
            <label className="field">姓名<input onChange={(event) => updateProfile({ name: event.target.value })} value={profile.name} /></label>
            <label className="field">联系电话<input inputMode="tel" onChange={(event) => updateProfile({ phone: event.target.value })} placeholder="请填写本人电话" value={profile.phone} /></label>
            <label className="field">邮箱<input onChange={(event) => updateProfile({ email: event.target.value })} placeholder="请填写本人邮箱" type="email" value={profile.email} /></label>
            <label className="field">教育经历<input onChange={(event) => updateProfile({ education: event.target.value })} value={profile.education} /></label>
            <label className="field full">当前简历文件<input onChange={(event) => updateProfile({ resumeFileName: event.target.value })} value={profile.resumeFileName} /></label>
          </div>
        </form>
        <section className="panel evidence-panel"><div className="section-heading"><div><h2>经历证据池</h2><p>{profile.evidence.length} 条已验证事实</p></div><FileCheck2 size={21} /></div><div className="evidence-list">{profile.evidence.map((item) => <article className="evidence-row" key={item.id}><div><strong>{item.title}</strong><span>{item.organization} · {item.period}</span><p>{item.summary}</p><div className="skill-list">{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div><CheckCircle2 className="verified" size={19} /></article>)}</div></section>
      </section>
    </>
  )
}
