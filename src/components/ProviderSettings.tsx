import { KeyRound, RotateCcw, Shield } from 'lucide-react'

import { useWorkbenchStore } from '../store/workbench-store'

export function ProviderSettings() {
  const { provider, updateProvider, resetDemo } = useWorkbenchStore()
  const ready = Boolean(provider.baseUrl.trim() && provider.model.trim() && provider.apiKey.trim())
  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">本地模型配置</p><h1>AI 配置</h1><p className="page-summary">支持 OpenAI 兼容的 Base URL 与模型名。密钥只保留在当前会话，不会写入本地存储。</p></div></header>
      <section className="settings-layout"><form className="panel provider-form" onSubmit={(event) => event.preventDefault()}><div className="section-heading"><div><h2><KeyRound size={19} />模型连接</h2><p>用于后续的 JD 提炼与简历改写建议。</p></div><span className={ready ? 'connection ready' : 'connection'}>{ready ? '配置就绪' : '未配置'}</span></div><label className="field">Base URL<input onChange={(event) => updateProvider({ baseUrl: event.target.value })} value={provider.baseUrl} /></label><label className="field">模型名称<input onChange={(event) => updateProvider({ model: event.target.value })} placeholder="例如 gpt-4.1-mini" value={provider.model} /></label><label className="field">API Key<input onChange={(event) => updateProvider({ apiKey: event.target.value, status: event.target.value.trim() ? 'ready' : 'not_configured' })} placeholder="仅保留到关闭页面前" type="password" value={provider.apiKey} /></label></form><aside className="panel boundary-panel"><Shield size={22} /><h2>自动化边界</h2><p>扩展只会在华为、腾讯和 PwC 中国的官网页面预填已审核字段。</p><ul><li>不处理登录、验证码或 OTP</li><li>不回答未知筛选问题</li><li>不点击最终提交</li></ul><button className="button secondary" onClick={resetDemo} type="button"><RotateCcw size={16} />恢复示例数据</button></aside></section>
    </>
  )
}
