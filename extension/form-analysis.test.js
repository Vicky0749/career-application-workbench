import { describe, expect, it } from 'vitest'

import { analyzeFormDocument, applyReviewedFillPlan, classifyField } from './form-analysis.js'

describe('recruitment form analysis', () => {
  it('classifies visible fields and keeps a stable fill identifier', () => {
    const page = new DOMParser().parseFromString('<label for="email">Email address</label><input id="email" type="email" required><label for="resume">Resume</label><input id="resume" type="file"><label for="declaration">I agree to the declaration</label><input id="declaration" type="checkbox">', 'text/html')
    const result = analyzeFormDocument(page)

    expect(result.fields.map((field) => field.key)).toEqual(['email', 'resume', 'declaration'])
    expect(result.fields[0]).toMatchObject({ fieldId: 'email', required: true, kind: 'email' })
    expect(result.fields[1]).toMatchObject({ kind: 'file' })
    expect(result.fields[2]).toMatchObject({ sensitive: true })
  })

  it('uses autocomplete and labels before ambiguous names', () => {
    expect(classifyField({ autocomplete: 'tel', label: '', name: 'contact', placeholder: '', type: 'text' })).toBe('phone')
    expect(classifyField({ autocomplete: '', label: 'Graduation date', name: 'date', placeholder: '', type: 'text' })).toBe('graduationDate')
  })

  it('writes only reviewed text and select fields and emits input events', () => {
    const page = new DOMParser().parseFromString('<input id="email" type="email"><select id="city"><option value="">Choose</option><option value="Shenzhen">Shenzhen</option></select><input id="resume" type="file">', 'text/html')
    const fields = analyzeFormDocument(page).fields
    let inputEvents = 0
    page.querySelector('#email').addEventListener('input', () => { inputEvents += 1 })

    const audit = applyReviewedFillPlan([
      { ...fields.find((field) => field.fieldId === 'email'), status: 'ready', value: 'vincent@example.com' },
      { ...fields.find((field) => field.fieldId === 'city'), status: 'ready', value: 'Shenzhen' },
      { ...fields.find((field) => field.fieldId === 'resume'), status: 'unsupported', value: 'resume.pdf' },
    ], page)

    expect(page.querySelector('#email').value).toBe('vincent@example.com')
    expect(page.querySelector('#city').value).toBe('Shenzhen')
    expect(inputEvents).toBe(1)
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: 'email', status: 'filled' }),
      expect.objectContaining({ fieldId: 'resume', status: 'skipped' }),
    ]))
  })
})
