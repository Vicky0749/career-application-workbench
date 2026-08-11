import { describe, expect, it } from 'vitest'

import { parseHeaders, readJsonPath, renderJsonTemplate } from './json-api'

describe('generic JSON API helpers', () => {
  it('renders only JSON-safe template values and resolves nested paths', () => {
    const body = renderJsonTemplate('{"query":{{queryJson}},"limit":{{maxResults}}}', { queryJson: '咨询 "实习"', maxResults: 12 })

    expect(body).toEqual({ query: '咨询 "实习"', limit: 12 })
    expect(readJsonPath({ data: { result: ['ok'] } }, 'data.result.0')).toBe('ok')
  })

  it('rejects invalid templates and header values before making a network request', () => {
    expect(() => renderJsonTemplate('{"query":{{queryJson}}', { queryJson: 'x' })).toThrow('自定义请求模板不是有效 JSON')
    expect(() => parseHeaders('{bad-json}')).toThrow('附加请求头必须是 JSON 对象')
  })
})
