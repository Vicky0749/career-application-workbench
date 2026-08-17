const compact = (value) => typeof value === 'string' ? value.trim() : ''

function readPath(value, path) {
  return compact(path).split('.').filter(Boolean).reduce((current, segment) => current && typeof current === 'object' ? current[Number.isInteger(Number(segment)) ? Number(segment) : segment] : undefined, value)
}

export function extractResponseText(payload, path) {
  const value = readPath(payload, path)
  return typeof value === 'string' ? value : JSON.stringify(value ?? '')
}

export function normalizeAiMappings(content) {
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) : content
    const mappings = parsed && typeof parsed === 'object' && Array.isArray(parsed.mappings) ? parsed.mappings : []
    return mappings.flatMap((mapping) => mapping && typeof mapping === 'object' && compact(mapping.fieldId) && compact(mapping.value) ? [{ fieldId: compact(mapping.fieldId), value: compact(mapping.value).slice(0, 2000) }] : [])
  } catch {
    return []
  }
}

function parsedHeaders(value) {
  try {
    const headers = JSON.parse(compact(value) || '{}')
    return headers && typeof headers === 'object' && !Array.isArray(headers) ? Object.fromEntries(Object.entries(headers).filter(([, headerValue]) => typeof headerValue === 'string')) : {}
  } catch {
    throw new Error('附加请求头必须是 JSON 对象')
  }
}

function endpointFor(provider) {
  const baseUrl = compact(provider?.baseUrl)
  if (!baseUrl) throw new Error('请先填写模型 API 地址')
  if (provider.protocol === 'custom-json' || /\/chat\/completions(?:\?|$)/.test(baseUrl)) return baseUrl
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

function requestBody(provider, prompt) {
  if (provider.protocol !== 'custom-json') return { model: compact(provider.model) || 'gpt-4o-mini', messages: [{ role: 'system', content: 'You map job-application form fields. Return JSON only.' }, { role: 'user', content: prompt }], temperature: 0 }
  const template = compact(provider.requestTemplate) || '{"model":{{modelJson}},"prompt":{{promptJson}}}'
  try {
    return JSON.parse(template.replaceAll('{{modelJson}}', JSON.stringify(compact(provider.model))).replaceAll('{{promptJson}}', JSON.stringify(prompt)))
  } catch {
    throw new Error('自定义请求模板不是有效 JSON')
  }
}

export async function requestAiMappings(provider, fields, profile, fetcher = fetch) {
  const allowedValues = Object.entries(profile?.fields ?? {}).filter(([, value]) => compact(value)).map(([key, value]) => ({ key, value: compact(value) }))
  const customAnswers = (Array.isArray(profile?.customAnswers) ? profile.customAnswers : []).map((answer) => ({ label: compact(answer?.label), value: compact(answer?.value) })).filter((answer) => answer.label && answer.value)
  const prompt = JSON.stringify({ fields: fields.map(({ fieldId, label, key, kind, required, options }) => ({ fieldId, label, key, kind, required, options })), allowedValues, customAnswers, output: { mappings: [{ fieldId: 'existing-field-id', value: 'one value copied exactly from allowedValues or customAnswers' }] } })
  const response = await fetcher(endpointFor(provider), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(provider.protocol === 'openai-compatible' && compact(provider.apiKey) ? { authorization: `Bearer ${compact(provider.apiKey)}` } : {}), ...parsedHeaders(provider.headersJson) },
    body: JSON.stringify(requestBody(provider, prompt)),
  })
  if (!response.ok) throw new Error(`模型 API 请求失败：${response.status}`)
  const payload = await response.json()
  return normalizeAiMappings(extractResponseText(payload, provider.protocol === 'custom-json' ? compact(provider.responsePath) || 'result' : compact(provider.responsePath) || 'choices.0.message.content'))
}
