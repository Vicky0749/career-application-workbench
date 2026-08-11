const finalActionPattern = /^(?:提交(?:申请|投递)?|确认(?:申请|投递)?|submit(?:\s+application)?|apply(?:\s+now)?)$/i

function isVisible(element) {
  if (!(element instanceof HTMLElement)) return false
  const style = getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && !element.hidden
}

function actionText(element) {
  if (element instanceof HTMLInputElement) return element.value.trim()
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function findFinalSubmissionControl(document) {
  const candidates = [...document.querySelectorAll('button, input[type="submit"], [role="button"]')]
  return candidates.find((element) => isVisible(element) && !(element instanceof HTMLButtonElement && element.disabled) && !(element instanceof HTMLInputElement && element.disabled) && finalActionPattern.test(actionText(element)))
}

export function submissionBlocker(document) {
  const captcha = document.querySelector('[data-sitekey], iframe[src*="captcha" i], iframe[src*="recaptcha" i]')
  if (captcha) return '页面包含验证码，需由本人完成验证'
  const password = [...document.querySelectorAll('input[type="password"]')].find(isVisible)
  if (password) return '页面仍需要登录，需由本人完成登录'
  const emptyRequired = [...document.querySelectorAll('input[required], textarea[required], select[required]')].find((element) => {
    if (!isVisible(element)) return false
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) return !element.checked
    if (element instanceof HTMLInputElement && element.type === 'file') return element.files?.length === 0
    return !('value' in element) || !String(element.value).trim()
  })
  if (emptyRequired) return '仍有必填字段未完成，请在官网补齐后再发送'
  return undefined
}

export function triggerReviewedSubmission(document) {
  const blocker = submissionBlocker(document)
  if (blocker) return { stage: 'needs_manual', detail: blocker }
  const control = findFinalSubmissionControl(document)
  if (!control) return { stage: 'needs_manual', detail: '未找到可安全识别的最终提交控件' }
  control.click()
  return { stage: 'sent', detail: '已触发官网提交，请在页面确认最终回执' }
}
