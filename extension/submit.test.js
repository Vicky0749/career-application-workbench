import { describe, expect, it } from 'vitest'

import { findFinalSubmissionControl, triggerReviewedSubmission } from './submit.js'

describe('reviewed submission', () => {
  it('only resolves a visible, enabled final action control', () => {
    const page = new DOMParser().parseFromString('<button disabled>提交申请</button><button style="display:none">提交申请</button><button id="send">提交申请</button>', 'text/html')
    expect(findFinalSubmissionControl(page)?.id).toBe('send')
  })

  it('stops on missing required facts and clicks only after validation', () => {
    const page = new DOMParser().parseFromString('<input required value=""><button id="send">Submit application</button>', 'text/html')
    expect(triggerReviewedSubmission(page)).toMatchObject({ stage: 'needs_manual' })
    page.querySelector('input').value = 'complete'
    let clicks = 0
    page.querySelector('#send').addEventListener('click', () => { clicks += 1 })
    expect(triggerReviewedSubmission(page)).toMatchObject({ stage: 'sent' })
    expect(clicks).toBe(1)
  })
})
