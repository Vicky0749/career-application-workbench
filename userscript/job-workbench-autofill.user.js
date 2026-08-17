// ==UserScript==
// @name         求职工作台 - 本地自动填写
// @namespace    https://github.com/Vicky0749/career-application-workbench
// @version      0.1.0
// @description  本地保存求职资料，审核后填写招聘表单，支持自填 AI API。
// @downloadURL  https://raw.githubusercontent.com/Vicky0749/career-application-workbench/master/userscript/job-workbench-autofill.user.js
// @updateURL    https://raw.githubusercontent.com/Vicky0749/career-application-workbench/master/userscript/job-workbench-autofill.user.js
// @match        https://*/*
// @match        http://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

const FIELD_KEYS = ['name', 'email', 'phone', 'education', 'school', 'degree', 'major', 'graduationDate', 'city', 'linkedIn', 'github', 'portfolio', 'workAuthorization']

const text = (value) => String(value ?? '').trim()
const normalized = (value) => text(value).toLocaleLowerCase()
const defaultFields = () => Object.fromEntries(FIELD_KEYS.map((key) => [key, '']))
const defaultProvider = () => ({ protocol: 'openai-compatible', baseUrl: '', model: 'gpt-4o-mini', apiKey: '', headersJson: '{}', requestTemplate: '{"model":{{modelJson}},"prompt":{{promptJson}}}', responsePath: 'choices.0.message.content' })

function normalizeAnswers(value) {
  if (!Array.isArray(value)) return []
  return value.flatMap((answer, index) => {
    const label = text(answer?.label)
    const candidate = text(answer?.value)
    return label && candidate ? [{ id: text(answer?.id) || `answer-${index + 1}`, label, value: candidate }] : []
  })
}

function normalizeRoleKeywords(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,，]/) : []
  return [...new Set(source.map(text).filter(Boolean))]
}

function createProfile(label = '我的简历', id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) {
  return { id, label: text(label) || '我的简历', roleKeywords: [], fields: defaultFields(), customAnswers: [] }
}

function normalizeState(value) {
  const candidate = value && typeof value === 'object' ? value : {}
  const profiles = Array.isArray(candidate.profiles) && candidate.profiles.length ? candidate.profiles.map((profile, index) => ({
    id: text(profile?.id) || `profile-${index + 1}`,
    label: text(profile?.label) || `简历 ${index + 1}`,
    roleKeywords: normalizeRoleKeywords(profile?.roleKeywords),
    fields: { ...defaultFields(), ...Object.fromEntries(FIELD_KEYS.map((key) => [key, text(profile?.fields?.[key])])) },
    customAnswers: normalizeAnswers(profile?.customAnswers),
  })) : [createProfile()]
  const requestedActive = text(candidate.activeProfileId)
  const provider = candidate.provider && typeof candidate.provider === 'object' ? candidate.provider : {}
  return {
    version: 1,
    profiles,
    activeProfileId: profiles.some((profile) => profile.id === requestedActive) ? requestedActive : profiles[0].id,
    provider: { ...defaultProvider(), protocol: provider.protocol === 'custom-json' ? 'custom-json' : 'openai-compatible', baseUrl: text(provider.baseUrl), model: text(provider.model) || defaultProvider().model, apiKey: text(provider.apiKey), headersJson: text(provider.headersJson) || '{}', requestTemplate: text(provider.requestTemplate) || defaultProvider().requestTemplate, responsePath: text(provider.responsePath) || defaultProvider().responsePath },
  }
}

const CREDENTIAL_AUTOCOMPLETE_TOKENS = new Set(['current-password', 'new-password', 'password', 'credential', 'one-time-code', 'webauthn'])

function autocompleteTokens(value) {
  return normalized(value).split(/\s+/).filter(Boolean)
}

function isCredentialField({ autocomplete = '', label = '', name = '', placeholder = '', type = '', kind = '' } = {}) {
  const controlType = normalized(type || kind)
  const source = normalized([label, name, placeholder].join(' '))
  return controlType === 'password' || controlType === 'credential'
    || autocompleteTokens(autocomplete).some((token) => CREDENTIAL_AUTOCOMPLETE_TOKENS.has(token))
    || /(?:^|[^a-z])(?:password|passcode|passphrase|pin|secret|credential)(?:$|[^a-z])/.test(source)
}

function isSensitiveField(field = {}) {
  return Boolean(field.sensitive) || field.key === 'declaration' || field.key === 'credential' || isCredentialField(field)
}

function classifyField({ autocomplete = '', label = '', name = '', placeholder = '', type = '' }) {
  const auto = normalized(autocomplete)
  const source = normalized([label, name, placeholder].join(' '))
  if (isCredentialField({ autocomplete, label, name, placeholder, type })) return 'credential'
  if (type === 'email' || auto === 'email' || /\be-?mail\b|邮箱/.test(source)) return 'email'
  if (type === 'tel' || auto === 'tel' || /phone|mobile|telephone|手机号|电话/.test(source)) return 'phone'
  if (auto === 'name' || /full\s*name|legal\s*name|姓名|名字/.test(source)) return 'name'
  if (/linkedin/.test(source)) return 'linkedIn'
  if (/github/.test(source)) return 'github'
  if (/portfolio|个人网站|作品集/.test(source)) return 'portfolio'
  if (/graduat|毕业时间|毕业日期|毕业年月/.test(source)) return 'graduationDate'
  if (/university|college|school|院校|学校/.test(source)) return 'school'
  if (/degree|学历|学位/.test(source)) return 'degree'
  if (/major|专业/.test(source)) return 'major'
  if (/education|教育经历|教育背景/.test(source)) return 'education'
  if (auto === 'address-level2' || /city|location|城市|所在地/.test(source)) return 'city'
  if (/work\s*authori[sz]ation|work\s*permit|签证|工作许可/.test(source)) return 'workAuthorization'
  if (/resume|\bcv\b|简历/.test(source)) return 'resume'
  if (/declaration|consent|privacy|agree|gender|ethnicity|race|disability|veteran|citizen|声明|同意|授权|性别|民族|残疾|政治面貌|身份证/.test(source)) return 'declaration'
  return 'unknown'
}

function visible(element) {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true' || element.type === 'hidden') return false
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : undefined
  return style?.display !== 'none' && style?.visibility !== 'hidden'
}

function analyzeFormDocument(root = document) {
  const controls = [...root.querySelectorAll('input, textarea, select')].filter(visible)
  return {
    pageTitle: text(root.title),
    hasCaptcha: Boolean(root.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')),
    hasLogin: Boolean([...root.querySelectorAll('input')].find((input) => visible(input) && isCredentialField({ autocomplete: input.getAttribute('autocomplete'), name: input.getAttribute('name'), placeholder: input.getAttribute('placeholder'), type: input.getAttribute('type') || input.type }))),
    fields: controls.map((control, index) => {
      const linked = control.id ? [...root.querySelectorAll('label')].find((label) => label.htmlFor === control.id) : undefined
      const label = text(linked?.textContent || control.closest('label')?.textContent || control.getAttribute('aria-label') || control.getAttribute('title'))
      const name = text(control.getAttribute('name'))
      const placeholder = text(control.getAttribute('placeholder'))
      const autocomplete = text(control.getAttribute('autocomplete'))
      const kind = control.tagName === 'TEXTAREA' ? 'textarea' : control.tagName === 'SELECT' ? 'select' : control.type || 'text'
      const declaredType = text(control.getAttribute('type')) || kind
      const key = classifyField({ autocomplete, label, name, placeholder, type: declaredType })
      const sensitive = isCredentialField({ autocomplete, label, name, placeholder, type: declaredType, kind }) || key === 'declaration' || /declaration|consent|privacy|agree|gender|ethnicity|race|disability|veteran|citizen|声明|同意|授权|性别|民族|残疾|政治面貌|身份证/.test(normalized([label, name, placeholder].join(' ')))
      const fieldId = control.getAttribute('data-job-workbench-field-id') || control.id || `job-workbench-${index + 1}`
      return { fieldId, label: label || name || placeholder || `字段 ${index + 1}`, name, placeholder, autocomplete, kind, key, required: control.required || control.getAttribute('aria-required') === 'true', sensitive, options: control.tagName === 'SELECT' ? [...control.options].map((option) => ({ value: option.value, label: text(option.textContent) })).filter((option) => option.label) : [] }
    }),
  }
}

function customAnswer(field, profile) {
  const label = normalized(field?.label)
  return (profile?.customAnswers ?? []).find((answer) => {
    const candidate = normalized(answer?.label)
    return candidate && (candidate === label || candidate.includes(label) || label.includes(candidate))
  })?.value
}

function buildFillPlan(fields, profile) {
  return (Array.isArray(fields) ? fields : []).map((field) => {
    if (isSensitiveField(field)) return { ...field, status: 'sensitive', reason: '声明、同意和敏感问题必须由本人处理' }
    if (field.kind === 'file' || field.key === 'resume') return { ...field, status: 'unsupported', reason: '简历文件必须由本人选择和上传' }
    const direct = text(profile?.fields?.[field.key])
    const value = direct || text(customAnswer(field, profile))
    if (value) return { ...field, status: 'ready', value, reason: direct ? '已匹配当前资料' : '已匹配常用答案' }
    return field.required || field.key !== 'unknown' ? { ...field, status: 'manual', reason: '未找到已审核内容' } : { ...field, status: 'skipped', reason: '非必填且未识别字段' }
  })
}

function normalizeAiMappings(mappings, fields, profile) {
  const allowed = new Set([...Object.values(profile?.fields ?? {}), ...(profile?.customAnswers ?? []).map((answer) => answer.value)].map(text).filter(Boolean))
  const known = new Map((fields ?? []).map((field) => [field.fieldId, field]))
  return Object.fromEntries((Array.isArray(mappings) ? mappings : []).flatMap((mapping) => {
    const field = known.get(text(mapping?.fieldId))
    const value = text(mapping?.value)
    return field && !isSensitiveField(field) && field.kind !== 'file' && value && allowed.has(value) ? [[field.fieldId, value]] : []
  }))
}

function applyAiMappings(plan, mappings) {
  return (plan ?? []).map((item) => item.status === 'manual' && !isSensitiveField(item) && mappings?.[item.fieldId] ? { ...item, status: 'ready', value: mappings[item.fieldId], reason: 'AI 已匹配本地已审核内容' } : item)
}

function recommendProfile(profiles, analysis) {
  const source = normalized([analysis?.pageTitle, ...(analysis?.fields ?? []).map((field) => `${field.label} ${field.name} ${field.placeholder}`)].join(' '))
  const candidates = (profiles ?? []).map((profile) => ({ profile, matchedKeywords: (profile.roleKeywords ?? []).filter((keyword) => source.includes(normalized(keyword))) })).filter(({ profile, matchedKeywords }) => profile?.id && matchedKeywords.length)
  if (!candidates.length) return null
  const winner = candidates.reduce((best, candidate) => candidate.matchedKeywords.length > best.matchedKeywords.length ? candidate : best)
  return { profileId: winner.profile.id, label: winner.profile.label, matchedKeywords: winner.matchedKeywords }
}

function calculateSupport(plan) {
  const counts = { total: 0, ready: 0, manual: 0, sensitive: 0, unsupported: 0, skipped: 0 }
  for (const item of plan ?? []) { counts.total += 1; if (item.status === 'ready' || item.status === 'filled') counts.ready += 1; else if (Object.hasOwn(counts, item.status)) counts[item.status] += 1 }
  return { ...counts, percentage: counts.total ? Math.round((counts.ready / counts.total) * 100) : 0 }
}

function applyReviewedFillPlan(plan, root = document) {
  const elements = [...root.querySelectorAll('[data-job-workbench-field-id]')]
  return (plan ?? []).map((item) => {
    if (isSensitiveField(item)) return { fieldId: item.fieldId || '', status: 'skipped', detail: '该字段需本人手动处理' }
    if (item.status !== 'ready' || !item.fieldId || typeof item.value !== 'string') return { fieldId: item.fieldId || '', status: 'skipped', detail: '未进入审核填写清单' }
    const element = elements.find((candidate) => candidate.getAttribute('data-job-workbench-field-id') === item.fieldId)
    if (!element || /^(file|password|checkbox|radio)$/i.test(element.type || '')) return { fieldId: item.fieldId, status: 'skipped', detail: '该字段需本人手动处理' }
    if (element.tagName === 'SELECT') {
      const option = [...element.options].find((candidate) => candidate.value === item.value || text(candidate.textContent) === item.value)
      if (!option) return { fieldId: item.fieldId, status: 'skipped', detail: '未找到匹配的下拉选项' }
      element.value = option.value
    } else {
      const descriptor = Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')
      descriptor?.set?.call(element, item.value)
    }
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return { fieldId: item.fieldId, status: 'filled', detail: '已填写审核内容' }
  })
}

const core = { FIELD_KEYS, createProfile, normalizeState, isCredentialField, isSensitiveField, classifyField, analyzeFormDocument, buildFillPlan, normalizeAiMappings, applyAiMappings, recommendProfile, calculateSupport, applyReviewedFillPlan }
if (typeof globalThis !== 'undefined') globalThis.JobWorkbenchCore = core

;
(() => {
  const core = globalThis.JobWorkbenchCore
  if (!core) return
  const storageKey = 'job-workbench-tampermonkey-v1'
  const getValue = (key, fallback) => typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback
  const setValue = (key, value) => { if (typeof GM_setValue === 'function') GM_setValue(key, value) }
  const fieldLabels = { name: '姓名', email: '邮箱', phone: '手机号', city: '所在城市', education: '教育经历', school: '学校', major: '专业', degree: '学历/学位', graduationDate: '毕业时间', workAuthorization: '工作授权/签证', linkedIn: 'LinkedIn', github: 'GitHub', portfolio: '个人网站/作品集' }
  let state = core.normalizeState(getValue(storageKey, {}))
  let analysis
  let plan = []

  const host = document.createElement('div')
  host.id = 'job-workbench-userscript'
  const shadow = host.attachShadow({ mode: 'open' })
  document.documentElement.append(host)
  shadow.innerHTML = `<style>
    :host{all:initial}.jw-fab{position:fixed;right:18px;bottom:18px;z-index:2147483647;border:0;border-radius:8px;background:#174d40;color:#fff;font:700 13px/1 system-ui;padding:12px 14px;box-shadow:0 6px 22px #0004;cursor:pointer}.jw-panel{position:fixed;inset:0 0 0 auto;z-index:2147483647;width:min(440px,100vw);overflow:auto;background:#edf1ec;color:#172d29;box-shadow:-8px 0 24px #0004;font:13px/1.4 system-ui,"Microsoft YaHei",sans-serif}.jw-panel[hidden]{display:none}.jw-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:14px;background:#174d40;color:#fff}.jw-head h1{margin:0;font-size:16px}.jw-close{margin-left:auto;border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer}.jw-body{padding:12px}.jw-card{margin:0 0 10px;padding:12px;border:1px solid #d7e0d8;border-radius:7px;background:#fff}.jw-card h2{margin:0 0 9px;font-size:14px}.jw-field{display:grid;gap:4px;margin:0 0 8px;color:#385249;font-size:11px;font-weight:700}.jw-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}.jw-full{grid-column:1/-1}input,textarea,select{box-sizing:border-box;width:100%;min-height:32px;border:1px solid #c7d5ca;border-radius:4px;padding:6px;background:#fff;color:#172d29;font:inherit}textarea{resize:vertical}.jw-button{border:1px solid #c8d6c9;border-radius:4px;background:#f6f8f4;color:#244b40;padding:8px 10px;font-weight:700;cursor:pointer}.jw-primary{background:#174d40;color:#fff;border-color:#174d40}.jw-actions{display:flex;gap:7px;flex-wrap:wrap}.jw-notice{margin:0 0 10px;padding:8px;background:#f7faf6;border:1px solid #d8e2d8;color:#5f746b}.jw-notice.error{background:#fff0db;color:#875d18}.jw-notice.success{background:#e5f3d9;color:#447226}.jw-audit{display:grid;gap:5px;margin:8px 0 0;padding:0;list-style:none}.jw-audit li{border-left:3px solid #d5dfd6;padding:7px;background:#f6f8f5}.jw-audit li.ready,.jw-audit li.filled{border-color:#77aa4d;background:#edf7e8}.jw-audit li.manual{border-color:#d9a242;background:#fff8eb}.jw-audit li.sensitive{border-color:#c76c59;background:#fff0ea}.jw-row{display:grid;grid-template-columns:1fr 1fr 26px;gap:5px;margin:0 0 6px}.jw-remove{border:1px solid #ecd4c9;background:#fff7f3;color:#9a554a;cursor:pointer}.jw-summary{padding:8px;background:#f4f7f3}.jw-recommend{margin-top:8px;padding:8px;background:#edf5e3;border-left:3px solid #78a955}.jw-muted{color:#67796f;font-size:11px}@media(max-width:390px){.jw-grid{grid-template-columns:1fr}.jw-row{grid-template-columns:1fr 1fr 26px}}</style>
    <button class="jw-fab" id="open" type="button">JW</button><aside class="jw-panel" id="panel" hidden><header class="jw-head"><strong>求职工作台</strong><span>本地优先</span><button class="jw-close" id="close" aria-label="关闭" type="button">×</button></header><main class="jw-body"><p id="notice" class="jw-notice">资料仅保存在本浏览器。不会上传文件、处理登录/验证码或提交申请。</p><section class="jw-card"><h2>当前简历</h2><label class="jw-field">简历版本<select id="profile"></select></label><div class="jw-actions"><button class="jw-button" id="new" type="button">新增版本</button><button class="jw-button" id="duplicate" type="button">复制版本</button><button class="jw-button" id="delete" type="button">删除版本</button></div><label class="jw-field">版本名称<input id="label"></label><label class="jw-field">适用岗位关键词<textarea id="keywords" rows="2" placeholder="产品经理, 产品运营"></textarea></label><div class="jw-grid" id="fields"></div><h2>常用问题与答案</h2><div id="answers"></div><button class="jw-button" id="add-answer" type="button">添加答案</button><p><button class="jw-button jw-primary" id="save" type="button">保存当前简历</button></p></section><section class="jw-card"><h2>当前页面</h2><div class="jw-actions"><button class="jw-button" id="analyze" type="button">分析页面</button><button class="jw-button" id="apply" type="button" disabled>填写已审核字段</button></div><div id="summary" class="jw-summary">尚未分析</div><div id="recommend"></div><ul id="audit" class="jw-audit"></ul></section><section class="jw-card"><h2>你的 API</h2><p class="jw-muted">仅点击 AI 映射时，才会把字段标签和当前资料中已有值发给你配置的 API。</p><label class="jw-field">接口协议<select id="protocol"><option value="openai-compatible">OpenAI 兼容</option><option value="custom-json">自定义 JSON</option></select></label><label class="jw-field">API 地址<input id="baseUrl" type="url"></label><label class="jw-field">模型名称<input id="model"></label><label class="jw-field">API Key<input id="apiKey" type="password"></label><label class="jw-field">附加请求头 JSON<textarea id="headersJson" rows="2"></textarea></label><label class="jw-field">自定义请求 JSON 模板<textarea id="requestTemplate" rows="2"></textarea></label><label class="jw-field">自定义响应路径<input id="responsePath"></label><div class="jw-actions"><button class="jw-button" id="save-api" type="button">保存 API</button><button class="jw-button" id="ai" type="button" disabled>AI 映射未知字段</button></div></section></main></aside>`
  const $ = (id) => shadow.getElementById(id)
  const active = () => state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0]
  const setNotice = (message, tone = '') => { $('notice').textContent = message; $('notice').className = `jw-notice ${tone}` }
  const persist = () => { state = core.normalizeState(state); setValue(storageKey, state) }

  function markAnalyzedFields(fields, root = document) {
    const controls = [...root.querySelectorAll('input, textarea, select')].filter((control) => {
      if (control.hidden || control.getAttribute('aria-hidden') === 'true' || control.type === 'hidden') return false
      const style = typeof getComputedStyle === 'function' ? getComputedStyle(control) : undefined
      return style?.display !== 'none' && style?.visibility !== 'hidden'
    })
    for (const [index, field] of (fields ?? []).entries()) {
      const control = controls[index]
      if (control && field?.fieldId) control.setAttribute('data-job-workbench-field-id', field.fieldId)
    }
  }

  function drawAnswers(profile) {
    $('answers').replaceChildren(...profile.customAnswers.map((answer) => {
      const row = document.createElement('div'); row.className = 'jw-row'; row.dataset.id = answer.id
      const label = document.createElement('input'); label.value = answer.label; label.placeholder = '问题标签'
      const value = document.createElement('input'); value.value = answer.value; value.placeholder = '已审核答案'
      const remove = document.createElement('button'); remove.className = 'jw-remove'; remove.type = 'button'; remove.textContent = '×'; remove.addEventListener('click', () => row.remove())
      row.append(label, value, remove); return row
    }))
  }
  function drawProfile() {
    $('profile').replaceChildren(...state.profiles.map((profile) => { const option = document.createElement('option'); option.value = profile.id; option.textContent = profile.label; option.selected = profile.id === state.activeProfileId; return option }))
    const profile = active(); $('label').value = profile.label; $('keywords').value = profile.roleKeywords.join(', '); drawAnswers(profile)
    for (const [key, label] of Object.entries(fieldLabels)) { const input = $(`f-${key}`); if (input) input.value = profile.fields[key] ?? '' }
  }
  function readProfile() {
    const profile = active()
    const answers = [...$('answers').querySelectorAll('.jw-row')].flatMap((row, index) => { const [label, value] = row.querySelectorAll('input'); return label.value.trim() && value.value.trim() ? [{ id: row.dataset.id || `answer-${index + 1}`, label: label.value.trim(), value: value.value.trim() }] : [] })
    return { ...profile, label: $('label').value.trim() || profile.label, roleKeywords: $('keywords').value.split(/[\n,，]/).map((value) => value.trim()).filter(Boolean), fields: Object.fromEntries(Object.keys(fieldLabels).map((key) => [key, $(`f-${key}`).value.trim()])), customAnswers: answers }
  }
  function saveProfile(silent = false) { const profile = readProfile(); state.profiles = state.profiles.map((item) => item.id === profile.id ? profile : item); persist(); drawProfile(); if (!silent) setNotice('当前简历已保存到 Tampermonkey 本地存储。', 'success'); return active() }
  function drawAudit() {
    const support = core.calculateSupport(plan); $('apply').disabled = !plan.some((item) => item.status === 'ready'); $('ai').disabled = !analysis || !state.provider.baseUrl || !plan.some((item) => item.status === 'manual')
    $('summary').textContent = analysis ? `${analysis.pageTitle || location.hostname}：${support.percentage}% 可自动填写 (${support.ready}/${support.total})` : '尚未分析'
    $('audit').replaceChildren(...plan.map((item) => { const row = document.createElement('li'); row.className = item.status; const title = document.createElement('strong'); title.textContent = item.label; const detail = document.createElement('div'); detail.textContent = item.status === 'ready' ? `将填写：${item.value}` : item.reason; row.append(title, detail); return row }))
    const recommendation = core.recommendProfile(state.profiles, analysis); $('recommend').replaceChildren(); if (recommendation && recommendation.profileId !== state.activeProfileId) { const box = document.createElement('div'); box.className = 'jw-recommend'; box.textContent = `推荐使用 ${recommendation.label}：${recommendation.matchedKeywords.join('、')}`; const button = document.createElement('button'); button.className = 'jw-button'; button.type = 'button'; button.textContent = '切换版本'; button.addEventListener('click', () => { saveProfile(true); state.activeProfileId = recommendation.profileId; persist(); drawProfile(); plan = core.buildFillPlan(analysis.fields, active()); drawAudit() }); box.append(' ', button); $('recommend').append(box) }
  }
  function drawProvider() { const p = state.provider; for (const key of ['protocol', 'baseUrl', 'model', 'apiKey', 'headersJson', 'requestTemplate', 'responsePath']) $(key).value = p[key] }
  function saveProvider() { try { const provider = Object.fromEntries(['protocol', 'baseUrl', 'model', 'apiKey', 'headersJson', 'requestTemplate', 'responsePath'].map((key) => [key, $(key).value.trim()])); JSON.parse(provider.headersJson || '{}'); if (provider.protocol === 'custom-json') JSON.parse(provider.requestTemplate); state.provider = provider; persist(); drawAudit(); setNotice('API 配置已保存到 Tampermonkey 本地存储。', 'success') } catch { setNotice('API JSON 配置无效。', 'error') } }
  function request(options) { return new Promise((resolve, reject) => { if (typeof GM_xmlhttpRequest !== 'function') return reject(new Error('当前脚本管理器不支持 API 请求')); GM_xmlhttpRequest({ ...options, onload: (response) => response.status >= 200 && response.status < 300 ? resolve(response) : reject(new Error(`API 返回 ${response.status}`)), onerror: () => reject(new Error('API 请求失败')) }) }) }
  function valueAt(object, path) { return path.split('.').filter(Boolean).reduce((value, key) => value?.[key], object) }
  async function mapAi() { try { saveProfile(true); const prompt = JSON.stringify({ instruction: 'Map only unknown application fields to exactly one provided value. Return JSON array: [{"fieldId":"...","value":"..."}]. Never invent values.', fields: analysis.fields.filter((field) => field.key === 'unknown' && !core.isSensitiveField(field) && field.kind !== 'file'), allowedValues: [...Object.values(active().fields), ...active().customAnswers.map((answer) => answer.value)].filter(Boolean) }); const p = state.provider; const headers = { 'Content-Type': 'application/json', ...JSON.parse(p.headersJson || '{}') }; if (p.apiKey) headers.Authorization = headers.Authorization || `Bearer ${p.apiKey}`; let url = p.baseUrl; let data; if (p.protocol === 'openai-compatible') { url = /chat\/completions\/?$/.test(url) ? url : `${url.replace(/\/$/, '')}/chat/completions`; data = JSON.stringify({ model: p.model, messages: [{ role: 'user', content: prompt }], temperature: 0 }) } else data = p.requestTemplate.replace('{{modelJson}}', JSON.stringify(p.model)).replace('{{promptJson}}', JSON.stringify(prompt)); const response = JSON.parse((await request({ method: 'POST', url, headers, data })).responseText); const content = p.protocol === 'openai-compatible' ? response?.choices?.[0]?.message?.content : valueAt(response, p.responsePath); const parsed = JSON.parse(String(content).replace(/^```(?:json)?\s*|\s*```$/g, '')); plan = core.applyAiMappings(plan, core.normalizeAiMappings(parsed, analysis.fields, active())); drawAudit(); setNotice('AI 只映射了资料库中已有的值。', 'success') } catch (error) { setNotice(error instanceof Error ? error.message : 'AI 映射失败。', 'error') } }

  const fields = $('fields'); for (const [key, label] of Object.entries(fieldLabels)) { const wrap = document.createElement('label'); wrap.className = `jw-field ${['education', 'workAuthorization', 'portfolio'].includes(key) ? 'jw-full' : ''}`; wrap.append(label); const input = document.createElement(['education'].includes(key) ? 'textarea' : 'input'); input.id = `f-${key}`; if (key === 'education') input.rows = 2; wrap.append(input); fields.append(wrap) }
  $('open').addEventListener('click', () => $('panel').hidden = false); $('close').addEventListener('click', () => $('panel').hidden = true)
  $('profile').addEventListener('change', () => { saveProfile(true); state.activeProfileId = $('profile').value; persist(); drawProfile(); if (analysis) plan = core.buildFillPlan(analysis.fields, active()); drawAudit() })
  $('new').addEventListener('click', () => { saveProfile(true); const profile = core.createProfile(`简历 ${state.profiles.length + 1}`); state.profiles.push(profile); state.activeProfileId = profile.id; persist(); drawProfile() })
  $('duplicate').addEventListener('click', () => { const source = saveProfile(true); const profile = { ...core.createProfile(`${source.label} 副本`), roleKeywords: [...source.roleKeywords], fields: { ...source.fields }, customAnswers: source.customAnswers.map((answer) => ({ ...answer })) }; state.profiles.push(profile); state.activeProfileId = profile.id; persist(); drawProfile() })
  $('delete').addEventListener('click', () => { if (state.profiles.length === 1) return setNotice('至少保留一份简历。', 'error'); state.profiles = state.profiles.filter((profile) => profile.id !== active().id); state.activeProfileId = state.profiles[0].id; persist(); drawProfile() })
  $('add-answer').addEventListener('click', () => { const profile = active(); profile.customAnswers.push({ id: `answer-${Date.now()}`, label: '', value: '' }); drawAnswers(profile) })
  $('save').addEventListener('click', () => saveProfile()); $('save-api').addEventListener('click', saveProvider)
  $('analyze').addEventListener('click', () => { const profile = saveProfile(true); analysis = core.analyzeFormDocument(document); markAnalyzedFields(analysis.fields, document); plan = core.buildFillPlan(analysis.fields, profile); drawAudit(); setNotice('页面已分析。请复核清单后再填写。', 'success') })
  $('apply').addEventListener('click', () => { const result = core.applyReviewedFillPlan(plan.filter((item) => item.status === 'ready'), document); plan = plan.map((item) => result.find((entry) => entry.fieldId === item.fieldId)?.status === 'filled' ? { ...item, status: 'filled' } : item); drawAudit(); setNotice(`已填写 ${result.filter((item) => item.status === 'filled').length} 个字段。`, 'success') })
  $('ai').addEventListener('click', () => void mapAi())
  drawProfile(); drawProvider(); drawAudit(); if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('打开求职工作台', () => { $('panel').hidden = false })
})()
