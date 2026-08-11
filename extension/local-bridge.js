window.addEventListener('career-workbench-extension', (event) => {
  const detail = event.detail
  if (!detail?.requestId || !detail?.type) return
  chrome.runtime.sendMessage({ type: 'workbench-batch', action: detail.type, items: detail.items }, (payload) => {
    const error = chrome.runtime.lastError?.message || payload?.error
    window.dispatchEvent(new CustomEvent('career-workbench-extension-result', { detail: { requestId: detail.requestId, payload, error } }))
  })
})
