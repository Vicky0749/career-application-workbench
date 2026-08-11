export function readJsonPath(value: unknown, path: string): unknown {
  if (!path.trim()) return value
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)]
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, value)
}

export function renderJsonTemplate(template: string, values: Record<string, unknown>): unknown {
  const rendered = Object.entries(values).reduce((output, [key, value]) => output.replaceAll(`{{${key}}}`, JSON.stringify(value)), template.trim())
  try {
    return JSON.parse(rendered)
  } catch {
    throw new Error('自定义请求模板不是有效 JSON。请使用 {{promptJson}}、{{modelJson}}、{{queryJson}} 或 {{maxResults}} 占位符。')
  }
}

export function parseHeaders(headersJson: string): Record<string, string> {
  if (!headersJson.trim()) return {}
  try {
    const parsed = JSON.parse(headersJson) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) => typeof value === 'string' ? [[key, value]] : []))
  } catch {
    throw new Error('附加请求头必须是 JSON 对象，例如 {"x-api-key":"..."}')
  }
}
