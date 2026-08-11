import { KeyRound, RotateCcw, Shield } from 'lucide-react'

import { useWorkbenchStore } from '../store/workbench-store'

export function ProviderSettings() {
  const { provider, updateProvider, resetDemo } = useWorkbenchStore()
  const ready = Boolean(provider.baseUrl.trim() && provider.model.trim() && provider.apiKey.trim())
  return (
    <>
      <header className="page-heading compact"><div><p className="page-kicker">本地模型与搜索配置</p><h1>AI 与搜索 API</h1><p className="page-summary">模型使用 OpenAI 兼容的 chat/completions 协议；搜索接口使用标准 HTTP JSON 请求。密钥只保留在当前会话，不会写入本地存储。</p></div></header>
      <section className="settings-layout"><form className="panel provider-form" onSubmit={(event) => event.preventDefault()}><div className="section-heading"><div><h2><KeyRound size={19} />模型连接</h2><p>用于简历事实提取；可填写任意 OpenAI 兼容厂商或本地代理。</p></div><span className={ready ? 'connection ready' : 'connection'}>{ready ? '配置就绪' : '未配置'}</span></div><label className="field">模型 Base URL<input onChange={(event) => updateProvider({ baseUrl: event.target.value })} value={provider.baseUrl} /></label><label className="field">模型名称<input onChange={(event) => updateProvider({ model: event.target.value })} placeholder="例如 gpt-4.1-mini" value={provider.model} /></label><label className="field">模型 API Key<input onChange={(event) => updateProvider({ apiKey: event.target.value, status: event.target.value.trim() ? 'ready' : 'not_configured' })} placeholder="仅保留到关闭页面前" type="password" value={provider.apiKey} /></label><div className="form-divider" /><div className="section-heading minor"><div><h2>搜索接口</h2><p>工作台会向该 URL POST {`{ query, max_results }`}，读取常见 JSON 结果数组。</p></div></div><label className="field">搜索 API URL<input onChange={(event) => updateProvider({ searchUrl: event.target.value })} placeholder="例如你的 Tavily/自建搜索网关 URL" value={provider.searchUrl} /></label><label className="field">搜索 API Key<input onChange={(event) => updateProvider({ searchApiKey: event.target.value })} placeholder="可选，仅保留到关闭页面前" type="password" value={provider.searchApiKey} /></label><label className="field">结果数组路径<input onChange={(event) => updateProvider({ searchResultPath: event.target.value })} placeholder="例如 results、organic 或 data.results" value={provider.searchResultPath} /></label></form><aside className="panel boundary-panel"><Shield size={22} /><h2>投递保护</h2><p>扩展只会在华为、腾讯和 PwC 中国官网页面处理本轮已审核岗位。</p><ul><li>不处理登录、验证码、OTP 或文件上传</li><li>未识别筛选题会停在人工审核状态</li><li>发送前需逐岗位审核并再次总确认</li></ul><button className="button secondary" onClick={resetDemo} type="button"><RotateCcw size={16} />恢复示例数据</button></aside></section>
    </>
  )
}
