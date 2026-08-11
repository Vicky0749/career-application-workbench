(() => {
  const adapters = [
    { id: 'huawei', label: '华为', host: 'career.huawei.com' },
    { id: 'tencent', label: '腾讯', host: 'join.qq.com' },
    { id: 'pwc-china', label: 'PwC 中国', host: 'www.pwccn.com' },
  ]
  const selectors = {
    title: ['h1', '[data-job-title]', '.job-title', '.position-title'],
    location: ['[data-job-location]', '.job-location', '.location', '.work-location'],
    description: ['[data-job-description]', '.job-description', '.job-detail', 'main'],
  }
  const fields = [
    { key: 'name', selectors: ['input[autocomplete="name"]', 'input[name*="name" i]', 'input[name*="姓名"]'] },
    { key: 'email', selectors: ['input[type="email"]', 'input[autocomplete="email"]', 'input[name*="email" i]'] },
    { key: 'phone', selectors: ['input[type="tel"]', 'input[autocomplete="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]'] },
    { key: 'education', selectors: ['textarea[name*="education" i]', 'input[name*="education" i]', 'textarea[name*="school" i]'] },
    { key: 'resume', selectors: ['input[type="file"]'] },
  ]

  const text = (selectorsToTry) => {
    for (const selector of selectorsToTry) {
      const value = document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim()
      if (value) return value
    }
    return ''
  }
  const adapter = () => adapters.find((item) => location.hostname === item.host || location.hostname.endsWith(`.${item.host}`))
  const capture = () => {
    const source = adapter()
    const title = text(selectors.title)
    if (!source || !title) return { ok: false, error: '未识别支持的官网职位页或岗位标题' }
    return { ok: true, employer: source.id, employerLabel: source.label, title, location: text(selectors.location) || '待职位页确认', description: text(selectors.description), url: location.href, capturedAt: new Date().toISOString() }
  }
  const setValue = (element, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
    descriptor?.set?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const prefill = (profile) => fields.map((field) => {
    const value = field.key === 'resume' ? profile.resumeFileName : profile[field.key]
    if (!value?.trim()) return { key: field.key, status: 'needs_review', detail: '缺少已审核事实' }
    if (field.key === 'resume') return { key: field.key, status: 'needs_review', detail: '请由本人选择并确认上传文件' }
    const element = field.selectors.map((selector) => document.querySelector(selector)).find(Boolean)
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return { key: field.key, status: 'skipped', detail: '未找到可安全填写的字段' }
    setValue(element, value)
    return { key: field.key, status: 'filled', detail: '已预填' }
  })

  const isVisible = (element) => {
    if (!(element instanceof HTMLElement)) return false
    const style = getComputedStyle(element)
    return style.display !== 'none' && style.visibility !== 'hidden' && !element.hidden
  }
  const submissionBlocker = () => {
    if (document.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')) return '页面包含验证码，需由本人完成验证'
    if ([...document.querySelectorAll('input[type="password"]')].some(isVisible)) return '页面仍需要登录，需由本人完成登录'
    const required = [...document.querySelectorAll('input[required], textarea[required], select[required]')].find((element) => {
      if (!isVisible(element)) return false
      if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) return !element.checked
      if (element instanceof HTMLInputElement && element.type === 'file') return element.files?.length === 0
      return !element.value?.trim()
    })
    return required ? '仍有必填字段未完成，请在官网补齐后再发送' : ''
  }
  const submitReviewedApplication = () => {
    const blocker = submissionBlocker()
    if (blocker) return { stage: 'needs_manual', detail: blocker }
    const controls = [...document.querySelectorAll('button, input[type="submit"], [role="button"]')]
    const target = controls.find((element) => {
      if (!isVisible(element) || element.disabled) return false
      const text = element instanceof HTMLInputElement ? element.value.trim() : element.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      return /^(?:提交(?:申请|投递)?|确认(?:申请|投递)?|submit(?:\s+application)?|apply(?:\s+now)?)$/i.test(text)
    })
    if (!target) return { stage: 'needs_manual', detail: '未找到可安全识别的最终提交控件' }
    target.click()
    return { stage: 'sent', detail: '已触发官网提交，请在页面确认最终回执' }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'capture-job') sendResponse(capture())
    if (message?.type === 'prefill-approved-facts') sendResponse({ ok: true, audit: prefill(message.profile) })
    if (message?.type === 'submit-reviewed-application') sendResponse({ ok: true, dispatch: submitReviewedApplication() })
  })
})()
