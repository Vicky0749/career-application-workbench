import { describe, expect, it } from 'vitest'

import { buildFillPlan, normalizeAiMappings } from './field-mapping.js'

const profile = {
  fields: { name: 'Vincent Wang', email: 'vincent@example.com', phone: '13800000000', education: '', school: '', degree: '', major: '', graduationDate: '', city: '', linkedIn: '', github: '', portfolio: '' },
  customAnswers: [{ id: 'availability', label: 'Earliest start date', value: '2026-09-01' }],
}

describe('safe field mapping', () => {
  it('uses approved profile values and blocks file and declaration fields', () => {
    const plan = buildFillPlan([
      { fieldId: 'name', key: 'name', label: 'Name', kind: 'text', required: true, sensitive: false },
      { fieldId: 'resume', key: 'resume', label: 'Resume', kind: 'file', required: true, sensitive: false },
      { fieldId: 'consent', key: 'declaration', label: 'I agree', kind: 'checkbox', required: true, sensitive: true },
    ], profile)

    expect(plan).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: 'name', status: 'ready', value: 'Vincent Wang' }),
      expect.objectContaining({ fieldId: 'resume', status: 'unsupported' }),
      expect.objectContaining({ fieldId: 'consent', status: 'sensitive' }),
    ]))
  })

  it('accepts AI mappings only for known, non-sensitive fields and approved values', () => {
    const fields = [
      { fieldId: 'start', key: 'unknown', label: 'Earliest start date', kind: 'text', required: true, sensitive: false },
      { fieldId: 'consent', key: 'declaration', label: 'I agree', kind: 'checkbox', required: true, sensitive: true },
    ]
    const mappings = normalizeAiMappings([{ fieldId: 'start', value: '2026-09-01' }, { fieldId: 'consent', value: 'true' }, { fieldId: 'other', value: 'x' }], fields, profile)

    expect(mappings).toEqual({ start: '2026-09-01' })
  })
})
