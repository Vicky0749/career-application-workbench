export const FIELD_KEYS = ['name', 'email', 'phone', 'education', 'school', 'degree', 'major', 'graduationDate', 'city', 'linkedIn', 'github', 'portfolio', 'workAuthorization']

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

export function createProfile(label = '我的简历', id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`) {
  return { id, label: text(label) || '我的简历', roleKeywords: [], fields: defaultFields(), customAnswers: [] }
}

export function normalizeState(value) {
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

export function isCredentialField({ autocomplete = '', label = '', name = '', placeholder = '', type = '', kind = '' } = {}) {
  const controlType = normalized(type || kind)
  const source = normalized([label, name, placeholder].join(' '))
  return controlType === 'password' || controlType === 'credential'
    || autocompleteTokens(autocomplete).some((token) => CREDENTIAL_AUTOCOMPLETE_TOKENS.has(token))
    || /(?:^|[^a-z])(?:password|passcode|passphrase|pin|secret|credential)(?:$|[^a-z])/.test(source)
}

export function isSensitiveField(field = {}) {
  return Boolean(field.sensitive) || field.key === 'declaration' || field.key === 'credential' || isCredentialField(field)
}

export function classifyField({ autocomplete = '', label = '', name = '', placeholder = '', type = '' }) {
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

export function analyzeFormDocument(root = document) {
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

export function buildFillPlan(fields, profile) {
  return (Array.isArray(fields) ? fields : []).map((field) => {
    if (isSensitiveField(field)) return { ...field, status: 'sensitive', reason: '声明、同意和敏感问题必须由本人处理' }
    if (field.kind === 'file' || field.key === 'resume') return { ...field, status: 'unsupported', reason: '简历文件必须由本人选择和上传' }
    const direct = text(profile?.fields?.[field.key])
    const value = direct || text(customAnswer(field, profile))
    if (value) return { ...field, status: 'ready', value, reason: direct ? '已匹配当前资料' : '已匹配常用答案' }
    return field.required || field.key !== 'unknown' ? { ...field, status: 'manual', reason: '未找到已审核内容' } : { ...field, status: 'skipped', reason: '非必填且未识别字段' }
  })
}

export function normalizeAiMappings(mappings, fields, profile) {
  const allowed = new Set([...Object.values(profile?.fields ?? {}), ...(profile?.customAnswers ?? []).map((answer) => answer.value)].map(text).filter(Boolean))
  const known = new Map((fields ?? []).map((field) => [field.fieldId, field]))
  return Object.fromEntries((Array.isArray(mappings) ? mappings : []).flatMap((mapping) => {
    const field = known.get(text(mapping?.fieldId))
    const value = text(mapping?.value)
    return field && !isSensitiveField(field) && field.kind !== 'file' && value && allowed.has(value) ? [[field.fieldId, value]] : []
  }))
}

export function applyAiMappings(plan, mappings) {
  return (plan ?? []).map((item) => item.status === 'manual' && !isSensitiveField(item) && mappings?.[item.fieldId] ? { ...item, status: 'ready', value: mappings[item.fieldId], reason: 'AI 已匹配本地已审核内容' } : item)
}

export function recommendProfile(profiles, analysis) {
  const source = normalized([analysis?.pageTitle, ...(analysis?.fields ?? []).map((field) => `${field.label} ${field.name} ${field.placeholder}`)].join(' '))
  const candidates = (profiles ?? []).map((profile) => ({ profile, matchedKeywords: (profile.roleKeywords ?? []).filter((keyword) => source.includes(normalized(keyword))) })).filter(({ profile, matchedKeywords }) => profile?.id && matchedKeywords.length)
  if (!candidates.length) return null
  const winner = candidates.reduce((best, candidate) => candidate.matchedKeywords.length > best.matchedKeywords.length ? candidate : best)
  return { profileId: winner.profile.id, label: winner.profile.label, matchedKeywords: winner.matchedKeywords }
}

export function calculateSupport(plan) {
  const counts = { total: 0, ready: 0, manual: 0, sensitive: 0, unsupported: 0, skipped: 0 }
  for (const item of plan ?? []) { counts.total += 1; if (item.status === 'ready' || item.status === 'filled') counts.ready += 1; else if (Object.hasOwn(counts, item.status)) counts[item.status] += 1 }
  return { ...counts, percentage: counts.total ? Math.round((counts.ready / counts.total) * 100) : 0 }
}

export function applyReviewedFillPlan(plan, root = document) {
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
