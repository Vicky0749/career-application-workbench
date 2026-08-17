import { describe, expect, it } from 'vitest'

import { analyzeFormDocument, buildFillPlan, normalizeAiMappings, normalizeState } from './core.js'

describe('Tampermonkey job workbench core', () => {
  it('normalizes a legacy profile without leaking provider defaults into candidate data', () => {
    const state = normalizeState({ profiles: [{ id: 'pm', label: 'Product', fields: { name: 'Vincent' }, roleKeywords: 'product manager, 产品经理' }] })

    expect(state.profiles[0]).toMatchObject({ id: 'pm', label: 'Product', roleKeywords: ['product manager', '产品经理'], fields: { name: 'Vincent', email: '' } })
    expect(state.provider).toMatchObject({ baseUrl: '', apiKey: '' })
  })

  it('keeps files and declarations out of an otherwise ready fill plan', () => {
    const plan = buildFillPlan([
      { fieldId: 'name', label: 'Name', kind: 'text', key: 'name', required: true, sensitive: false },
      { fieldId: 'resume', label: 'Resume', kind: 'file', key: 'resume', required: true, sensitive: false },
      { fieldId: 'consent', label: 'Consent', kind: 'checkbox', key: 'declaration', required: true, sensitive: true },
    ], { fields: { name: 'Vincent' }, customAnswers: [] })

    expect(plan.map((item) => item.status)).toEqual(['ready', 'unsupported', 'sensitive'])
  })

  it('accepts AI mappings only when the value already exists in the current profile', () => {
    const fields = [{ fieldId: 'availability', label: 'Start date', kind: 'text', key: 'unknown', required: true, sensitive: false }]
    const profile = { fields: { name: 'Vincent' }, customAnswers: [{ id: 'date', label: 'Start date', value: '2027-06-01' }] }

    expect(normalizeAiMappings([{ fieldId: 'availability', value: '2027-06-01' }, { fieldId: 'availability', value: 'invented' }], fields, profile)).toEqual({ availability: '2027-06-01' })
  })

  it('keeps password credentials sensitive and outside all automatic mapping paths', () => {
    document.body.innerHTML = '<form><input name="accountPassword" autocomplete="section-login current-password"><input name="newPassword" autocomplete="new-password"></form>'

    const fields = analyzeFormDocument(document).fields
    const profile = { fields: { name: 'Vincent' }, customAnswers: [{ id: 'secret', label: 'Password', value: 'secret' }] }
    const plan = buildFillPlan(fields, profile)

    expect(fields.map((field) => [field.key, field.sensitive])).toEqual([['credential', true], ['credential', true]])
    expect(plan.map((item) => item.status)).toEqual(['sensitive', 'sensitive'])
    expect(normalizeAiMappings(fields.map((field) => ({ fieldId: field.fieldId, value: 'secret' })), fields, profile)).toEqual({})
  })

  it('treats credential autocomplete and type variants as sensitive', () => {
    document.body.innerHTML = '<form><input autocomplete="credential"><input type="credential"></form>'

    const fields = analyzeFormDocument(document).fields
    const profile = { fields: { name: 'Vincent' }, customAnswers: [{ id: 'secret', label: 'Credential', value: 'secret' }] }
    const plan = buildFillPlan(fields, profile)

    expect(fields.map((field) => [field.key, field.sensitive])).toEqual([['credential', true], ['credential', true]])
    expect(plan.map((item) => item.status)).toEqual(['sensitive', 'sensitive'])
    expect(normalizeAiMappings(fields.map((field) => ({ fieldId: field.fieldId, value: 'secret' })), fields, profile)).toEqual({})
  })

  it('analyzes fields without adding runtime marker attributes', () => {
    document.body.innerHTML = '<form><label for="candidate-name">Name</label><input id="candidate-name" name="name"></form>'
    const input = document.querySelector('input')

    const analysis = analyzeFormDocument(document)

    expect(analysis.fields[0].fieldId).toBe('candidate-name')
    expect(input?.hasAttribute('data-job-workbench-field-id')).toBe(false)
  })
})
