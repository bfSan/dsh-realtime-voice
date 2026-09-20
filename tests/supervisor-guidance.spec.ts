import { expect, it, vi } from 'vitest'
import { resolveSupervisorGuidance } from '../src/host/supervisor-guidance.ts'
it('keeps failures visible and does not load a project skill without a project', async () => {
  const readFile = vi.fn(async () => { throw new Error('ENOENT') })
  const failed = await resolveSupervisorGuidance({ skill: '/missing/voice.md', instructions: '' }, { readFile })
  expect(failed.status).toBe('error')
  expect(failed.body).toContain('先确认汇报对象')
  const get = vi.fn()
  expect((await resolveSupervisorGuidance({ skill: 'voice', instructions: '' }, { skills: { get } })).status).toBe('error')
  expect(get).not.toHaveBeenCalled()
})
