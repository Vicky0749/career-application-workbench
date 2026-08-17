import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

const bundlePath = resolve(process.cwd(), 'userscript', 'job-workbench-autofill.user.js')

describe('Tampermonkey userscript bundle', () => {
  beforeEach(() => {
    delete globalThis.JobWorkbenchCore
    document.body.replaceChildren()
    document.querySelector('#job-workbench-userscript')?.remove()
  })

  it('loads without treating the core object as a function and mounts its host', async () => {
    const bundle = await readFile(bundlePath, 'utf8')

    expect(() => new Function(bundle)()).not.toThrow()
    expect(document.querySelector('#job-workbench-userscript')).not.toBeNull()
  })

  it('marks analyzed controls only after the user requests page analysis', async () => {
    document.body.innerHTML = '<form><input name="candidateName"></form>'
    const input = document.querySelector('input')
    const bundle = await readFile(bundlePath, 'utf8')

    new Function(bundle)()
    expect(input?.hasAttribute('data-job-workbench-field-id')).toBe(false)

    document.querySelector('#job-workbench-userscript')?.shadowRoot?.getElementById('analyze')?.click()

    expect(input?.getAttribute('data-job-workbench-field-id')).toBe('job-workbench-1')
  })
})
