import { describe, expect, it } from 'vitest'

import manifest from './manifest.json'

describe('extension manifest', () => {
  it('uses MV3 and limits remote website access to the three supported employers', () => {
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.host_permissions).toEqual(expect.arrayContaining([
      'https://career.huawei.com/*',
      'https://join.qq.com/*',
      'https://www.pwccn.com/*',
    ]))
    expect(manifest.host_permissions).not.toContain('<all_urls>')
  })

  it('uses local-only workbench bridge permissions', () => {
    expect(manifest.host_permissions.filter((host) => host.startsWith('http://'))).toEqual(['http://127.0.0.1/*', 'http://localhost/*'])
    expect(manifest.permissions).toContain('tabs')
    expect(manifest.permissions).toContain('scripting')
    expect(manifest.optional_host_permissions).toEqual(['https://*/*', 'http://*/*'])
  })

  it('declares store-ready local autofill metadata without a fixed all-sites permission', () => {
    expect(manifest.name).toContain('本地自动填写')
    expect(manifest.version).toBe('0.2.0')
    expect(manifest.icons).toEqual({ '16': 'icons/icon-16.png', '32': 'icons/icon-32.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png' })
    expect(manifest.host_permissions).not.toContain('https://*/*')
  })
})
