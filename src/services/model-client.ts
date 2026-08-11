import type { ProviderConfig } from '../domain/types'
import { parseHeaders, readJsonPath, renderJsonTemplate } from './json-api'

type Fetcher = typeof fetch

const completionPath = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`
}

export async function requestModelText(provider: ProviderConfig, system: string, prompt: string, fetcher: Fetcher = fetch): Promise<string> {
  if (!provider.baseUrl.trim()) throw new Error('请先在 AI 配置中填写模型 API URL')
  const standardProtocol = provider.modelProtocol === 'openai-compatible'
  if (standardProtocol && (!provider.model.trim() || !provider.apiKey.trim())) throw new Error('OpenAI 兼容接口需要模型名称和 API Key')
  const customHeaders = parseHeaders(provider.modelHeadersJson)
  const headers: Record<string, string> = { 'content-type': 'application/json', ...customHeaders }
  if (provider.apiKey.trim() && !Object.keys(headers).some((key) => key.toLocaleLowerCase() === 'authorization')) headers.authorization = `Bearer ${provider.apiKey.trim()}`
  const response = await fetcher(standardProtocol ? completionPath(provider.baseUrl) : provider.baseUrl.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify(standardProtocol ? {
      model: provider.model.trim(),
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    } : renderJsonTemplate(provider.modelRequestTemplate, { modelJson: provider.model.trim(), promptJson: `${system}\n\n${prompt}` })),
  })
  if (!response.ok) throw new Error(`模型请求失败：${response.status}`)
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = standardProtocol ? body.choices?.[0]?.message?.content : readJsonPath(body, provider.modelResponsePath)
  if (typeof content !== 'string' || !content.trim()) throw new Error('模型未返回可解析内容，请检查响应路径')
  return content
}
