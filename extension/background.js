chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

const activeBatchTabs = new Map()
const batchTabsKey = 'careerBatchTabs'

async function rememberBatchTab(jobId, tabId) {
  activeBatchTabs.set(jobId, tabId)
  const stored = await chrome.storage.session.get(batchTabsKey)
  await chrome.storage.session.set({ [batchTabsKey]: { ...stored[batchTabsKey], [jobId]: tabId } })
}

async function rememberedBatchTab(jobId) {
  const cached = activeBatchTabs.get(jobId)
  if (cached) return cached
  const stored = await chrome.storage.session.get(batchTabsKey)
  const tabId = stored[batchTabsKey]?.[jobId]
  if (typeof tabId === 'number') activeBatchTabs.set(jobId, tabId)
  return tabId
}

async function waitForPage(tabId, timeoutMs = 30_000) {
  try {
    if ((await chrome.tabs.get(tabId)).status === 'complete') return true
  } catch {
    return false
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve(false)
    }, timeoutMs)
    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve(true)
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
  })
}

const stamp = () => new Date().toISOString()

async function prefillOne(item) {
  const tab = await chrome.tabs.create({ url: item.job.sourceUrl, active: false })
  if (!tab.id) return { jobId: item.job.id, record: { stage: 'failed', detail: '无法创建官网标签页', updatedAt: stamp() } }
  await rememberBatchTab(item.job.id, tab.id)
  const loaded = await waitForPage(tab.id)
  if (!loaded) return { jobId: item.job.id, record: { stage: 'needs_manual', detail: '官网页面加载超时，请在该标签页手动继续', updatedAt: stamp(), tabId: tab.id } }
  await new Promise((resolve) => setTimeout(resolve, 600))
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'prefill-approved-facts', profile: item.profile })
    const filled = result?.audit?.some((entry) => entry.status === 'filled')
    return {
      jobId: item.job.id,
      record: filled
        ? { stage: 'prefilled', detail: '已预填可识别字段；请在官网补传简历并完成最终审核', updatedAt: stamp(), tabId: tab.id }
        : { stage: 'needs_manual', detail: '未识别可安全预填字段，请在官网手动处理', updatedAt: stamp(), tabId: tab.id },
    }
  } catch (error) {
    return { jobId: item.job.id, record: { stage: 'needs_manual', detail: `无法预填：${error.message}`, updatedAt: stamp(), tabId: tab.id } }
  }
}

async function submitOne(item) {
  const tabId = await rememberedBatchTab(item.job.id)
  if (!tabId) return { jobId: item.job.id, record: { stage: 'needs_manual', detail: '未找到本轮官网标签页，请重新预填', updatedAt: stamp() } }
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'submit-reviewed-application' })
    return { jobId: item.job.id, record: { ...result.dispatch, updatedAt: stamp(), tabId } }
  } catch (error) {
    return { jobId: item.job.id, record: { stage: 'needs_manual', detail: `无法发送：${error.message}`, updatedAt: stamp(), tabId } }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'workbench-batch') return undefined
  const items = Array.isArray(message.items) ? message.items : []
  const worker = message.action === 'submit-batch' ? submitOne : prefillOne
  Promise.all(items.map(worker)).then((jobs) => sendResponse({ jobs })).catch((error) => sendResponse({ error: error.message }))
  return true
})
