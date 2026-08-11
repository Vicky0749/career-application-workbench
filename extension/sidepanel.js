const fieldIds = ['name', 'email', 'phone', 'education', 'resumeFileName']
const captureResult = document.querySelector('#capture-result')
const auditList = document.querySelector('#audit')

const readProfile = () => Object.fromEntries(fieldIds.map((id) => [id, document.querySelector(`#${id}`).value.trim()]))
const writeProfile = (profile) => fieldIds.forEach((id) => { document.querySelector(`#${id}`).value = profile?.[id] ?? '' })
const currentTab = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
const sendToPage = async (message) => {
  const tab = await currentTab()
  if (!tab?.id) throw new Error('未找到当前网页')
  return chrome.tabs.sendMessage(tab.id, message)
}

chrome.storage.local.get('careerDraft').then(({ careerDraft }) => writeProfile(careerDraft))

document.querySelector('#save-profile').addEventListener('click', async () => {
  await chrome.storage.local.set({ careerDraft: readProfile() })
  captureResult.textContent = '档案已保存在扩展本地存储中'
  captureResult.className = 'result success'
})

document.querySelector('#capture').addEventListener('click', async () => {
  try {
    const captured = await sendToPage({ type: 'capture-job' })
    if (!captured?.ok) throw new Error(captured?.error ?? '读取失败')
    captureResult.textContent = `${captured.title} · ${captured.location}`
    captureResult.className = 'result success'
    await chrome.storage.local.set({ lastCapturedJob: captured })
  } catch (error) {
    captureResult.textContent = error.message
    captureResult.className = 'result error'
  }
})

document.querySelector('#prefill').addEventListener('click', async () => {
  auditList.replaceChildren()
  try {
    const result = await sendToPage({ type: 'prefill-approved-facts', profile: readProfile() })
    for (const entry of result?.audit ?? []) {
      const item = document.createElement('li')
      item.className = entry.status
      item.textContent = `${entry.key}：${entry.detail}`
      auditList.append(item)
    }
  } catch (error) {
    const item = document.createElement('li')
    item.className = 'needs_review'
    item.textContent = `无法预填：${error.message}`
    auditList.append(item)
  }
})
