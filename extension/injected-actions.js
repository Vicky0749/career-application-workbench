export function inspectRecruitmentPage() {
  const text = (document.body?.innerText || document.body?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30_000)
  const links = [...document.querySelectorAll('a[href]')].flatMap((anchor) => {
    try {
      const url = new URL(anchor.getAttribute('href'), location.href)
      const label = anchor.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      if (!label || (url.protocol !== 'https:' && url.protocol !== 'http:')) return []
      return [{ text: label.slice(0, 180), url: url.toString() }]
    } catch {
      return []
    }
  }).slice(0, 100)
  return { pageUrl: location.href, pageTitle: document.title.trim(), excerpt: text, links, capturedAt: new Date().toISOString() }
}

export function prefillRecruitmentPage(profile) {
  const definitions = [
    { key: 'name', selectors: ['input[autocomplete="name"]', 'input[name*="name" i]', 'input[name*="姓名"]'] },
    { key: 'email', selectors: ['input[type="email"]', 'input[autocomplete="email"]', 'input[name*="email" i]'] },
    { key: 'phone', selectors: ['input[type="tel"]', 'input[autocomplete="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]'] },
    { key: 'education', selectors: ['textarea[name*="education" i]', 'input[name*="education" i]', 'textarea[name*="school" i]'] },
    { key: 'resume', selectors: ['input[type="file"]'] },
  ]
  const setValue = (element, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
    descriptor?.set?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const audit = definitions.map((field) => {
    const value = field.key === 'resume' ? profile.resumeFileName : profile[field.key]
    if (!value?.trim()) return { key: field.key, status: 'needs_review', detail: '缺少已审核事实' }
    if (field.key === 'resume') return { key: field.key, status: 'needs_review', detail: '请由本人选择并确认上传文件' }
    const element = field.selectors.map((selector) => document.querySelector(selector)).find(Boolean)
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return { key: field.key, status: 'skipped', detail: '未找到可安全填写的字段' }
    setValue(element, value)
    return { key: field.key, status: 'filled', detail: '已预填' }
  })
  return { ok: true, audit }
}

export function submitReviewedRecruitmentPage() {
  const isVisible = (element) => {
    if (!(element instanceof HTMLElement)) return false
    const style = getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden' && !element.hidden
  }
  if (document.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')) return { stage: 'needs_manual', detail: '页面包含验证码，需由本人完成验证' }
  if ([...document.querySelectorAll('input[type="password"]')].some(isVisible)) return { stage: 'needs_manual', detail: '页面仍需要登录，需由本人完成登录' }
  const required = [...document.querySelectorAll('input[required], textarea[required], select[required]')].find((element) => {
    if (!isVisible(element)) return false
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) return !element.checked
    if (element instanceof HTMLInputElement && element.type === 'file') return element.files?.length === 0
    return !element.value?.trim()
  })
  if (required) return { stage: 'needs_manual', detail: '仍有必填字段未完成，请在官网补齐后再发送' }
  const control = [...document.querySelectorAll('button, input[type="submit"], [role="button"]')].find((element) => {
    if (!isVisible(element) || element.disabled) return false
    const text = element instanceof HTMLInputElement ? element.value.trim() : element.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    return /^(?:提交(?:申请|投递)?|确认(?:申请|投递)?|submit(?:\s+application)?|apply(?:\s+now)?)$/i.test(text)
  })
  if (!control) return { stage: 'needs_manual', detail: '未找到可安全识别的最终提交控件' }
  control.click()
  return { stage: 'sent', detail: '已触发官网提交，请在页面确认最终回执' }
}
