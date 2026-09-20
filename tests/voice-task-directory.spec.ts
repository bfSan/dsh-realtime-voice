import { expect, it, vi } from 'vitest'
import { VoiceTaskDirectory } from '../src/host/voice-task-directory.ts'

it('reads a terminal result without starting execution and keeps running state separate', async () => {
  const create = vi.fn()
  const directory = new VoiceTaskDirectory({
    projects: async () => [],
    agents: async () => [],
    tasks: async () => [{ sessionId: 's1', running: true, blank: false }],
    history: async () => [
      { type: 'assistant/message', seq: 3, data: { turn: 1, message: { content: [{ type: 'text', text: '已完成核对' }] } } },
      { type: 'turn/end', seq: 4, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'assistant/message', seq: 6, data: { turn: 2, message: { content: [{ type: 'text', text: '还在工作' }] } } },
    ],
    create,
  })
  expect(await directory.readResult('s1')).toMatchObject({ state: 'completed', text: '已完成核对', running: true, turn: 1, seq: 4 })
  expect(create).not.toHaveBeenCalled()
})

it('validates project and preset before creating and converges duplicate request IDs', async () => {
  const create = vi.fn(async (input: { sessionId: string }) => ({ sessionId: input.sessionId }))
  const directory = new VoiceTaskDirectory({
    projects: async () => [{ id: 'w', path: '/safe', title: '测试' }],
    agents: async () => [{ id: 'a', name: '执行' }],
    tasks: async () => [], history: async () => [], create,
  })
  await expect(directory.createTask({ workspace: 'missing', presetId: 'a', requestId: 'invalid' })).rejects.toThrow()
  const input = { workspace: 'w', presetId: 'a', requestId: 'r' }
  const [a, b] = await Promise.all([directory.createTask(input), directory.createTask(input)])
  expect(a).toEqual(b)
  expect(create).toHaveBeenCalledTimes(1)
})
