const FIELD_DEFINITIONS = [
  { key: 'name', label: '姓名', selectors: ['input[autocomplete="name"]', 'input[name*="name" i]', 'input[name*="姓名"]'] },
  { key: 'email', label: '邮箱', selectors: ['input[type="email"]', 'input[autocomplete="email"]', 'input[name*="email" i]'] },
  { key: 'phone', label: '联系电话', selectors: ['input[type="tel"]', 'input[autocomplete="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]'] },
  { key: 'education', label: '教育经历', selectors: ['textarea[name*="education" i]', 'input[name*="education" i]', 'textarea[name*="school" i]'] },
  { key: 'resume', label: '简历文件', selectors: ['input[type="file"]'] },
]

export function buildPrefillPlan(profile) {
  return FIELD_DEFINITIONS.map((field) => {
    const value = field.key === 'resume' ? profile.resumeFileName : profile[field.key]
    return {
      ...field,
      value: value ?? '',
      status: value?.trim() ? 'ready' : 'needs_review',
    }
  })
}

function setValue(element, value) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

export function applyPrefillPlan(document, plan) {
  return plan.map((field) => {
    if (field.status !== 'ready') return { key: field.key, status: 'needs_review', detail: '缺少已审核事实' }
    if (field.key === 'resume') return { key: field.key, status: 'needs_review', detail: '请由本人选择并确认上传文件' }

    const element = field.selectors.map((selector) => document.querySelector(selector)).find(Boolean)
    if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return { key: field.key, status: 'skipped', detail: '未找到可安全填写的字段' }
    }

    setValue(element, field.value)
    return { key: field.key, status: 'filled', detail: '已预填' }
  })
}
