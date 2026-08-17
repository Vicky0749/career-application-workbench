import { requestAiMappings } from './api-client.js'
import { applyReviewedFillPlan, inspectRecruitmentForm } from './form-analysis.js'
import { inspectRecruitmentPage, prefillRecruitmentPage, submitReviewedRecruitmentPage } from './injected-actions.js'

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

const activeBatchTabs = new Map()
const batchTabsKey = 'careerBatchTabs'
const stamp = () => new Date().toISOString()

function originPattern(url) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('仅支持 HTTP(S) 网站')
  return `${parsed.origin}/*`
}

async function hasSiteAccess(url) {
  return chrome.permissions.contains({ origins: [originPattern(url)] })
}

async function ensureSiteAccess(url) {
  const origins = [originPattern(url)]
  if (await chrome.permissions.contains({ origins })) return true
  return chrome.permissions.request({ origins })
}

async function currentRecruitmentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) throw new Error('未找到当前招聘页面')
  if (!await hasSiteAccess(tab.url)) throw new Error('请先在侧栏中授权当前招聘网站')
  return tab
}

async function inspectCurrentTab() {
  const tab = await currentRecruitmentTab()
  const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectRecruitmentForm })
  if (!result?.result) throw new Error('未读取到当前页面的可见表单')
  return result.result
}

async function applyCurrentTabPlan(plan) {
  const tab = await currentRecruitmentTab()
  const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: applyReviewedFillPlan, args: [plan] })
  return result?.result ?? []
}

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
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdated); resolve(false) }, timeoutMs)
    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve(true)
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
  })
}

async function inspectOne(target) {
  try {
    if (!await ensureSiteAccess(target.sourceUrl)) return { targetId: target.id, status: 'failed', error: '未获得该招聘网站的访问授权' }
    const tab = await chrome.tabs.create({ url: target.sourceUrl, active: false })
    if (!tab.id) return { targetId: target.id, status: 'failed', error: '无法打开招聘官网页面' }
    if (!await waitForPage(tab.id)) return { targetId: target.id, status: 'failed', error: '招聘官网页面加载超时' }
    const [injected] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectRecruitmentPage })
    return injected?.result ? { targetId: target.id, status: 'inspected', inspection: injected.result } : { targetId: target.id, status: 'failed', error: '未读取到招聘页面内容' }
  } catch (error) {
    return { targetId: target.id, status: 'failed', error: `页面检查失败：${error.message}` }
  }
}

async function prefillOne(item) {
  if (!await ensureSiteAccess(item.job.sourceUrl)) return { jobId: item.job.id, record: { stage: 'needs_manual', detail: '未获得该招聘网站的访问授权', updatedAt: stamp() } }
  const tab = await chrome.tabs.create({ url: item.job.sourceUrl, active: false })
  if (!tab.id) return { jobId: item.job.id, record: { stage: 'failed', detail: '无法创建官网标签页', updatedAt: stamp() } }
  await rememberBatchTab(item.job.id, tab.id)
  if (!await waitForPage(tab.id)) return { jobId: item.job.id, record: { stage: 'needs_manual', detail: '官网页面加载超时，请在该标签页手动继续', updatedAt: stamp(), tabId: tab.id } }
  await new Promise((resolve) => setTimeout(resolve, 600))
  try {
    const [injected] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: prefillRecruitmentPage, args: [item.profile] })
    const filled = injected?.result?.audit?.some((entry) => entry.status === 'filled')
    return { jobId: item.job.id, record: filled ? { stage: 'prefilled', detail: '已预填可识别字段；请在官网补传简历并完成最终审核', updatedAt: stamp(), tabId: tab.id } : { stage: 'needs_manual', detail: '未识别可安全预填字段，请在官网手动处理', updatedAt: stamp(), tabId: tab.id } }
  } catch (error) {
    return { jobId: item.job.id, record: { stage: 'needs_manual', detail: `无法预填：${error.message}`, updatedAt: stamp(), tabId: tab.id } }
  }
}

async function submitOne(item) {
  const tabId = await rememberedBatchTab(item.job.id)
  if (!tabId) return { jobId: item.job.id, record: { stage: 'needs_manual', detail: '未找到本轮官网标签页，请重新预填', updatedAt: stamp() } }
  try {
    const [injected] = await chrome.scripting.executeScript({ target: { tabId }, func: submitReviewedRecruitmentPage })
    return { jobId: item.job.id, record: { ...(injected?.result ?? { stage: 'needs_manual', detail: '未读取到页面提交结果' }), updatedAt: stamp(), tabId } }
  } catch (error) {
    return { jobId: item.job.id, record: { stage: 'needs_manual', detail: `无法发送：${error.message}`, updatedAt: stamp(), tabId } }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'autofill-extension') {
    const handlers = {
      'analyze-current-tab': async () => ({ inspection: await inspectCurrentTab() }),
      'apply-reviewed-fill': async () => ({ audit: await applyCurrentTabPlan(message.plan) }),
      'map-unknown-fields': async () => ({ mappings: await requestAiMappings(message.provider, message.fields, message.profile) }),
    }
    const handler = handlers[message.action]
    if (!handler) return undefined
    handler().then((payload) => sendResponse({ ok: true, ...payload })).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type !== 'workbench-batch') return undefined
  const items = Array.isArray(message.items) ? message.items : []
  if (message.action === 'inspect-targets') {
    Promise.all(items.map(inspectOne)).then((targets) => sendResponse({ targets })).catch((error) => sendResponse({ error: error.message }))
    return true
  }
  const worker = message.action === 'submit-batch' ? submitOne : prefillOne
  Promise.all(items.map(worker)).then((jobs) => sendResponse({ jobs })).catch((error) => sendResponse({ error: error.message }))
  return true
})
