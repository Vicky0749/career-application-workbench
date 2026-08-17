import { applyAiMappings, buildFillPlan, normalizeAiMappings } from './field-mapping.js'
import { createProfile, FIELD_KEYS, loadState, saveState } from './profile-store.js'

const byId = (id) => document.querySelector(`#${id}`)
const profileSelect = byId('profile-select')
const auditList = byId('audit-list')
const notice = byId('notice')
const pageSummary = byId('page-summary')
const supportSummary = byId('support-summary')
const readyCount = byId('ready-count')
const customAnswers = byId('custom-answers')
const providerProtocol = byId('provider-protocol')
const customApiFields = byId('custom-api-fields')

let extensionState = await loadState()
let analysis
let fillPlan = []

const activeProfile = () => extensionState.profiles.find((profile) => profile.id === extensionState.activeProfileId) ?? extensionState.profiles[0]
const setNotice = (message, tone = 'muted') => { notice.textContent = message; notice.className = `notice ${tone}` }

function renderProfileOptions() {
  profileSelect.replaceChildren(...extensionState.profiles.map((profile) => {
    const option = document.createElement('option')
    option.value = profile.id
    option.textContent = profile.label
    option.selected = profile.id === extensionState.activeProfileId
    return option
  }))
}

function renderCustomAnswers(profile) {
  customAnswers.replaceChildren(...profile.customAnswers.map((answer) => {
    const row = document.createElement('div')
    row.className = 'answer-row'
    row.dataset.answerId = answer.id
    const label = document.createElement('input')
    label.value = answer.label
    label.placeholder = '问题标签'
    label.setAttribute('aria-label', '常用问题标签')
    const value = document.createElement('input')
    value.value = answer.value
    value.placeholder = '已审核答案'
    value.setAttribute('aria-label', '常用问题答案')
    const remove = document.createElement('button')
    remove.className = 'remove-answer'
    remove.type = 'button'
    remove.textContent = '-'
    remove.title = '移除此答案'
    remove.addEventListener('click', () => { row.remove() })
    row.append(label, value, remove)
    return row
  }))
}

function readCustomAnswers() {
  return [...customAnswers.querySelectorAll('.answer-row')].flatMap((row, index) => {
    const inputs = row.querySelectorAll('input')
    const label = inputs[0]?.value.trim()
    const value = inputs[1]?.value.trim()
    return label && value ? [{ id: row.dataset.answerId || `answer-${index + 1}`, label, value }] : []
  })
}

function writeProfile(profile) {
  renderProfileOptions()
  FIELD_KEYS.forEach((key) => { const element = byId(`field-${key}`); if (element) element.value = profile.fields[key] ?? '' })
  renderCustomAnswers(profile)
}

function readProfile() {
  const current = activeProfile()
  return {
    ...current,
    label: current.label,
    fields: Object.fromEntries(FIELD_KEYS.map((key) => [key, byId(`field-${key}`)?.value.trim() ?? ''])),
    customAnswers: readCustomAnswers(),
  }
}

async function persistProfile(showNotice = true) {
  const profile = readProfile()
  extensionState = { ...extensionState, profiles: extensionState.profiles.map((item) => item.id === profile.id ? profile : item) }
  extensionState = await saveState(extensionState)
  if (showNotice) setNotice('当前简历已保存到浏览器本地。', 'success')
  return activeProfile()
}

function renderAudit(items = fillPlan) {
  const summary = items.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] ?? 0) + 1 }), {})
  const ready = summary.ready ?? 0
  readyCount.textContent = String(ready)
  byId('apply-fill').disabled = ready === 0
  byId('ai-map').disabled = !analysis || !extensionState.provider.baseUrl || !items.some((item) => item.status === 'manual')
  supportSummary.hidden = !analysis
  if (analysis) {
    supportSummary.replaceChildren(...[
      ['ready', `可填写 ${ready}`],
      ['manual', `待补充 ${(summary.manual ?? 0) + (summary.sensitive ?? 0)}`],
      ['unsupported', `人工处理 ${(summary.unsupported ?? 0) + (summary.skipped ?? 0)}`],
    ].map(([tone, label]) => { const chip = document.createElement('span'); chip.className = tone; chip.textContent = label; return chip }))
  }
  if (!items.length) return
  auditList.replaceChildren(...items.map((item) => {
    const entry = document.createElement('li')
    entry.className = item.status
    const label = document.createElement('strong')
    label.textContent = item.label || item.fieldId
    const detail = document.createElement('span')
    detail.textContent = item.status === 'ready' ? `将填写：${item.value}` : item.reason || item.detail || '需要人工确认'
    entry.append(label, detail)
    return entry
  }))
}

function renderProvider() {
  const provider = extensionState.provider
  providerProtocol.value = provider.protocol
  byId('provider-baseUrl').value = provider.baseUrl
  byId('provider-model').value = provider.model
  byId('provider-apiKey').value = provider.apiKey
  byId('provider-headersJson').value = provider.headersJson
  byId('provider-requestTemplate').value = provider.requestTemplate
  byId('provider-responsePath').value = provider.responsePath
  customApiFields.hidden = provider.protocol !== 'custom-json'
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) throw new Error('未找到可分析的当前网页')
  return tab
}

function originFor(url) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('仅支持 HTTP(S) 页面或 API 地址')
  return `${parsed.origin}/*`
}

async function requestAccess(url) {
  const origins = [originFor(url)]
  if (await chrome.permissions.contains({ origins })) return true
  return chrome.permissions.request({ origins })
}

const send = (action, payload = {}) => chrome.runtime.sendMessage({ type: 'autofill-extension', action, ...payload })

async function analyzePage() {
  try {
    const profile = await persistProfile(false)
    const tab = await currentTab()
    if (!await requestAccess(tab.url)) throw new Error('未获得当前招聘网站的访问授权')
    const result = await send('analyze-current-tab')
    if (!result?.ok) throw new Error(result?.error || '页面分析失败')
    analysis = result.inspection
    fillPlan = buildFillPlan(analysis.fields, profile)
    pageSummary.replaceChildren(Object.assign(document.createElement('strong'), { textContent: analysis.pageTitle || new URL(tab.url).hostname }), Object.assign(document.createElement('span'), { textContent: `${analysis.fields.length} 个可见字段${analysis.hasLogin ? ' · 需要登录' : ''}${analysis.hasCaptcha ? ' · 存在验证码' : ''}` }))
    renderAudit()
    setNotice('页面已分析。请核对审计清单后再填写。', 'success')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : '页面分析失败', 'error')
  }
}

async function mapWithAi() {
  try {
    const profile = await persistProfile(false)
    if (!analysis) throw new Error('请先分析页面')
    if (!extensionState.provider.baseUrl) throw new Error('请先保存模型 API 配置')
    if (!await requestAccess(extensionState.provider.baseUrl)) throw new Error('未获得模型 API 地址的访问授权')
    const result = await send('map-unknown-fields', { provider: extensionState.provider, fields: analysis.fields, profile })
    if (!result?.ok) throw new Error(result?.error || 'AI 映射失败')
    fillPlan = applyAiMappings(fillPlan, normalizeAiMappings(result.mappings, analysis.fields, profile))
    renderAudit()
    setNotice('AI 仅匹配了当前资料中已有的值；请复核新增的可填写项。', 'success')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'AI 映射失败', 'error')
  }
}

async function applyFill() {
  try {
    if (!fillPlan.some((item) => item.status === 'ready')) throw new Error('没有可填写的已审核字段')
    const result = await send('apply-reviewed-fill', { plan: fillPlan.filter((item) => item.status === 'ready') })
    if (!result?.ok) throw new Error(result?.error || '页面填写失败')
    const audit = result.audit ?? []
    fillPlan = fillPlan.map((item) => {
      const update = audit.find((entry) => entry.fieldId === item.fieldId)
      return update?.status === 'filled' ? { ...item, status: 'filled', detail: update.detail } : item
    })
    renderAudit()
    setNotice(`已填写 ${audit.filter((item) => item.status === 'filled').length} 个字段；其余项目请在页面手动完成。`, 'success')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : '页面填写失败', 'error')
  }
}

async function saveProvider() {
  try {
    const provider = {
      protocol: providerProtocol.value,
      baseUrl: byId('provider-baseUrl').value.trim(),
      model: byId('provider-model').value.trim(),
      apiKey: byId('provider-apiKey').value.trim(),
      headersJson: byId('provider-headersJson').value.trim() || '{}',
      requestTemplate: byId('provider-requestTemplate').value.trim(),
      responsePath: byId('provider-responsePath').value.trim(),
    }
    JSON.parse(provider.headersJson)
    if (provider.protocol === 'custom-json') JSON.parse(provider.requestTemplate)
    if (provider.baseUrl && !await requestAccess(provider.baseUrl)) throw new Error('未获得模型 API 地址的访问授权')
    extensionState = await saveState({ ...extensionState, provider })
    renderProvider()
    renderAudit()
    setNotice('API 配置已保存在扩展本地。', 'success')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'API 配置保存失败', 'error')
  }
}

profileSelect.addEventListener('change', async () => { await persistProfile(false); extensionState = { ...extensionState, activeProfileId: profileSelect.value }; extensionState = await saveState(extensionState); writeProfile(activeProfile()); renderAudit() })
byId('new-profile').addEventListener('click', async () => { await persistProfile(false); const profile = createProfile(`简历 ${extensionState.profiles.length + 1}`); extensionState = await saveState({ ...extensionState, profiles: [...extensionState.profiles, profile], activeProfileId: profile.id }); writeProfile(activeProfile()); renderAudit(); setNotice('已新增空白简历版本。', 'success') })
byId('duplicate-profile').addEventListener('click', async () => { const source = await persistProfile(false); const profile = { ...createProfile(`${source.label} 副本`), fields: { ...source.fields }, customAnswers: source.customAnswers.map((answer) => ({ ...answer })) }; extensionState = await saveState({ ...extensionState, profiles: [...extensionState.profiles, profile], activeProfileId: profile.id }); writeProfile(activeProfile()); renderAudit(); setNotice('已复制当前简历版本。', 'success') })
byId('delete-profile').addEventListener('click', async () => { if (extensionState.profiles.length === 1) return setNotice('至少保留一份本地简历。', 'error'); const retained = extensionState.profiles.filter((profile) => profile.id !== activeProfile().id); extensionState = await saveState({ ...extensionState, profiles: retained, activeProfileId: retained[0].id }); writeProfile(activeProfile()); fillPlan = []; renderAudit(); setNotice('已删除当前简历版本。', 'success') })
byId('add-answer').addEventListener('click', () => { const profile = activeProfile(); profile.customAnswers = [...profile.customAnswers, { id: `answer-${Date.now()}`, label: '', value: '' }]; renderCustomAnswers(profile) })
byId('save-profile').addEventListener('click', () => void persistProfile())
byId('analyze-page').addEventListener('click', () => void analyzePage())
byId('ai-map').addEventListener('click', () => void mapWithAi())
byId('apply-fill').addEventListener('click', () => void applyFill())
providerProtocol.addEventListener('change', () => { customApiFields.hidden = providerProtocol.value !== 'custom-json' })
byId('save-provider').addEventListener('click', () => void saveProvider())

writeProfile(activeProfile())
renderProvider()
renderAudit()
