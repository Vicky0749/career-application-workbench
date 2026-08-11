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

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'capture-job') sendResponse(capture())
    if (message?.type === 'prefill-approved-facts') sendResponse({ ok: true, audit: prefill(message.profile) })
  })
})()
