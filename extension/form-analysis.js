const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const normalized = (value) => compact(value).toLocaleLowerCase()

const includesAny = (value, patterns) => patterns.some((pattern) => pattern.test(value))

export function classifyField({ autocomplete = '', label = '', name = '', placeholder = '', type = '' }) {
  const auto = normalized(autocomplete)
  const text = normalized([label, name, placeholder].join(' '))
  const inputType = normalized(type)
  if (inputType === 'email' || auto === 'email' || includesAny(text, [/\be-?mail\b/, /邮箱/])) return 'email'
  if (inputType === 'tel' || auto === 'tel' || includesAny(text, [/phone/, /mobile/, /telephone/, /手机号/, /电话/])) return 'phone'
  if (auto === 'name' || includesAny(text, [/full\s*name/, /legal\s*name/, /姓名/, /名字/])) return 'name'
  if (includesAny(text, [/linkedin/])) return 'linkedIn'
  if (includesAny(text, [/github/])) return 'github'
  if (includesAny(text, [/portfolio/, /个人网站/, /作品集/])) return 'portfolio'
  if (includesAny(text, [/graduat/, /毕业时间/, /毕业日期/, /毕业年月/])) return 'graduationDate'
  if (includesAny(text, [/university/, /college/, /school/, /院校/, /学校/])) return 'school'
  if (includesAny(text, [/degree/, /学历/, /学位/])) return 'degree'
  if (includesAny(text, [/major/, /专业/])) return 'major'
  if (includesAny(text, [/education/, /教育经历/, /教育背景/])) return 'education'
  if (auto === 'address-level2' || includesAny(text, [/city/, /location/, /城市/, /所在地/])) return 'city'
  if (includesAny(text, [/work\s*authori[sz]ation/, /work\s*permit/, /签证/, /工作许可/])) return 'workAuthorization'
  if (includesAny(text, [/resume/, /cv\b/, /简历/])) return 'resume'
  if (includesAny(text, [/declaration/, /consent/, /privacy/, /agree/, /声明/, /同意/, /授权/, /性别/, /民族/, /残疾/, /政治面貌/, /身份证/])) return 'declaration'
  return 'unknown'
}

export function isSensitiveField({ label = '', name = '', placeholder = '', key = '' }) {
  const text = normalized([label, name, placeholder, key].join(' '))
  return includesAny(text, [/declaration/, /consent/, /privacy/, /agree/, /gender/, /ethnicity/, /race/, /disability/, /veteran/, /citizen/, /身份证/, /声明/, /同意/, /授权/, /性别/, /民族/, /残疾/, /政治面貌/])
}

function visible(element) {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false
  if (typeof getComputedStyle === 'function') {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

function labelFor(control, document) {
  const forLabel = control.id ? [...document.querySelectorAll('label')].find((label) => label.htmlFor === control.id) : undefined
  return compact(forLabel?.textContent || control.closest('label')?.textContent || control.getAttribute('aria-label') || control.getAttribute('title'))
}

function fieldIdFor(control, index) {
  const existing = control.getAttribute('data-job-workbench-field-id') || control.id
  const fieldId = existing || `job-workbench-${index + 1}`
  control.setAttribute('data-job-workbench-field-id', fieldId)
  return fieldId
}

function kindFor(control) {
  if (control instanceof HTMLTextAreaElement) return 'textarea'
  if (control instanceof HTMLSelectElement) return 'select'
  if (control instanceof HTMLInputElement) return control.type || 'text'
  return 'unknown'
}

export function analyzeFormDocument(document) {
  const controls = [...document.querySelectorAll('input, textarea, select')].filter(visible)
  return {
    pageTitle: compact(document.title),
    hasCaptcha: Boolean(document.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')),
    hasLogin: Boolean([...document.querySelectorAll('input[type="password"]')].find(visible)),
    fields: controls.map((control, index) => {
      const label = labelFor(control, document)
      const name = compact(control.getAttribute('name'))
      const placeholder = compact(control.getAttribute('placeholder'))
      const autocomplete = compact(control.getAttribute('autocomplete'))
      const kind = kindFor(control)
      const key = classifyField({ autocomplete, label, name, placeholder, type: kind })
      return {
        fieldId: fieldIdFor(control, index),
        label: label || name || placeholder || `字段 ${index + 1}`,
        name,
        placeholder,
        autocomplete,
        kind,
        key,
        required: control.required || control.getAttribute('aria-required') === 'true',
        sensitive: isSensitiveField({ label, name, placeholder, key }),
        options: control instanceof HTMLSelectElement ? [...control.options].map((option) => ({ value: option.value, label: compact(option.textContent) })).filter((option) => option.label) : [],
      }
    }),
  }
}

export function inspectRecruitmentForm() {
  const compactText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
  const low = (value) => compactText(value).toLocaleLowerCase()
  const matches = (value, patterns) => patterns.some((pattern) => pattern.test(value))
  const classify = (label, name, placeholder, type, autocomplete) => {
    const auto = low(autocomplete)
    const text = low([label, name, placeholder].join(' '))
    if (type === 'email' || auto === 'email' || matches(text, [/\be-?mail\b/, /邮箱/])) return 'email'
    if (type === 'tel' || auto === 'tel' || matches(text, [/phone/, /mobile/, /telephone/, /手机号/, /电话/])) return 'phone'
    if (auto === 'name' || matches(text, [/full\s*name/, /legal\s*name/, /姓名/, /名字/])) return 'name'
    if (matches(text, [/linkedin/])) return 'linkedIn'
    if (matches(text, [/github/])) return 'github'
    if (matches(text, [/portfolio/, /个人网站/, /作品集/])) return 'portfolio'
    if (matches(text, [/graduat/, /毕业时间/, /毕业日期/])) return 'graduationDate'
    if (matches(text, [/university/, /college/, /school/, /院校/, /学校/])) return 'school'
    if (matches(text, [/degree/, /学历/, /学位/])) return 'degree'
    if (matches(text, [/major/, /专业/])) return 'major'
    if (matches(text, [/education/, /教育经历/, /教育背景/])) return 'education'
    if (auto === 'address-level2' || matches(text, [/city/, /location/, /城市/, /所在地/])) return 'city'
    if (matches(text, [/resume/, /cv\b/, /简历/])) return 'resume'
    if (matches(text, [/declaration/, /consent/, /privacy/, /agree/, /声明/, /同意/, /授权/, /性别/, /民族/, /残疾/, /政治面貌/, /身份证/])) return 'declaration'
    return 'unknown'
  }
  const isVisible = (element) => {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false
    const style = getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden'
  }
  const controls = [...document.querySelectorAll('input, textarea, select')].filter(isVisible)
  return {
    pageTitle: compactText(document.title),
    hasCaptcha: Boolean(document.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')),
    hasLogin: Boolean([...document.querySelectorAll('input[type="password"]')].find(isVisible)),
    fields: controls.map((control, index) => {
      const linked = control.id ? [...document.querySelectorAll('label')].find((label) => label.htmlFor === control.id) : undefined
      const label = compactText(linked?.textContent || control.closest('label')?.textContent || control.getAttribute('aria-label') || control.getAttribute('title'))
      const name = compactText(control.getAttribute('name'))
      const placeholder = compactText(control.getAttribute('placeholder'))
      const autocomplete = compactText(control.getAttribute('autocomplete'))
      const kind = control instanceof HTMLTextAreaElement ? 'textarea' : control instanceof HTMLSelectElement ? 'select' : control instanceof HTMLInputElement ? control.type || 'text' : 'unknown'
      const key = classify(label, name, placeholder, kind, autocomplete)
      const fieldId = control.getAttribute('data-job-workbench-field-id') || control.id || `job-workbench-${index + 1}`
      control.setAttribute('data-job-workbench-field-id', fieldId)
      const text = low([label, name, placeholder, key].join(' '))
      return { fieldId, label: label || name || placeholder || `字段 ${index + 1}`, name, placeholder, autocomplete, kind, key, required: control.required || control.getAttribute('aria-required') === 'true', sensitive: matches(text, [/declaration/, /consent/, /privacy/, /agree/, /gender/, /ethnicity/, /race/, /disability/, /veteran/, /citizen/, /身份证/, /声明/, /同意/, /授权/, /性别/, /民族/, /残疾/, /政治面貌/]), options: control instanceof HTMLSelectElement ? [...control.options].map((option) => ({ value: option.value, label: compactText(option.textContent) })).filter((option) => option.label) : [] }
    }),
  }
}

export function applyReviewedFillPlan(plan, root = document) {
  const setNativeValue = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    descriptor?.set?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
  return (Array.isArray(plan) ? plan : []).map((item) => {
    if (item?.status !== 'ready' || !item?.fieldId || typeof item.value !== 'string') return { fieldId: item?.fieldId || '', status: 'skipped', detail: '未进入已审核填写清单' }
    const escaped = typeof CSS?.escape === 'function' ? CSS.escape(item.fieldId) : item.fieldId.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
    const element = root.querySelector(`[data-job-workbench-field-id="${escaped}"]`)
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return { fieldId: item.fieldId, status: 'skipped', detail: '页面字段已变化，请重新分析' }
    if (element instanceof HTMLInputElement && (element.type === 'file' || element.type === 'checkbox' || element.type === 'radio' || element.type === 'password')) return { fieldId: item.fieldId, status: 'skipped', detail: '该字段需要本人手动处理' }
    if (element instanceof HTMLSelectElement) {
      const option = [...element.options].find((candidate) => candidate.value === item.value || candidate.textContent?.trim() === item.value)
      if (!option) return { fieldId: item.fieldId, status: 'skipped', detail: '未找到匹配的下拉选项' }
      element.value = option.value
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return { fieldId: item.fieldId, status: 'filled', detail: '已填写已审核值' }
    }
    setNativeValue(element, item.value)
    return { fieldId: item.fieldId, status: 'filled', detail: '已填写已审核值' }
  })
}
