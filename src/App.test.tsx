import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('filters the job pool by career track', async () => {
    const user = userEvent.setup()
    const app = render(<App />)

    await user.click(app.getByRole('button', { name: '岗位池' }))
    expect(app.getAllByText('商业分析实习生').length).toBeGreaterThan(0)

    await user.click(app.getByRole('button', { name: '挑战' }))

    expect(app.queryByText('商业分析实习生')).not.toBeInTheDocument()
    expect(app.getAllByText('战略咨询实习生').length).toBeGreaterThan(0)
  })

  it('keeps an application in review until the candidate completes missing facts and screening answers', async () => {
    const user = userEvent.setup()
    const app = render(<App />)

    await user.click(app.getByRole('button', { name: '档案与证据' }))
    await user.type(app.getByLabelText('联系电话'), '13800000000')
    await user.type(app.getByLabelText('邮箱'), 'wang@example.com')
    await user.click(app.getByRole('button', { name: '审核队列' }))

    expect(app.getByText('待人工回答：是否具备在中国大陆工作的合法资格？')).toBeInTheDocument()
    await user.type(app.getByLabelText('是否具备在中国大陆工作的合法资格？'), '是')

    expect(app.getAllByText('预填就绪').length).toBeGreaterThan(0)
    await user.click(app.getAllByLabelText('纳入本轮投递')[0])
    expect(app.getByText('本轮已选 1 个')).toBeInTheDocument()
    expect(app.getByText('一键发送 0 个')).toBeDisabled()
  })
})
