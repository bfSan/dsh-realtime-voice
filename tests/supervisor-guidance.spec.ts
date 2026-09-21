import { expect, it, vi } from 'vitest'
import { resolveSupervisorGuidance } from '../src/host/supervisor-guidance.ts'
it('keeps an unreadable guidance file visible and still speaks the base layer', async () => {
  const readFile = vi.fn(async () => { throw new Error('ENOENT') })
  const failed = await resolveSupervisorGuidance({ skill: '/missing/voice.md', instructions: '', butlerBriefing: '' }, { readFile })
  expect(failed.status).toBe('error')
  expect(failed.body).toContain('先确认汇报对象')
  expect(failed.body).toContain('不要念绝对路径')
})

// A butler persona is global: it must resolve before any project is chosen,
// otherwise the identity layer simply never loads on an independent call.
it('loads a named butler skill without a project', async () => {
  const get = vi.fn(async () => ({ content: '说话简短，先报身份。' }))
  const loaded = await resolveSupervisorGuidance({ skill: 'voice', instructions: '', butlerBriefing: '' }, { skills: { get } })
  expect(loaded.status).toBe('loaded')
  expect(get).toHaveBeenCalledOnce()
  expect(loaded.body).toContain('说话简短，先报身份。')
})

it('keeps the base layer first, then default rules, then the butler briefing', async () => {
  const result = await resolveSupervisorGuidance(
    { skill: 'my-butler', instructions: '', butlerBriefing: '你是语音总管「运维」。' },
    { skills: { get: async () => ({ content: '说话简短' }) } },
  )
  expect(result.status).toBe('loaded')
  const body = result.body!
  expect(body.indexOf('不要念绝对路径')).toBeLessThan(body.indexOf('先确认汇报对象'))
  expect(body.indexOf('先确认汇报对象')).toBeLessThan(body.indexOf('你是语音总管「运维」。'))
  expect(body.indexOf('你是语音总管「运维」。')).toBeLessThan(body.indexOf('说话简短'))
})
