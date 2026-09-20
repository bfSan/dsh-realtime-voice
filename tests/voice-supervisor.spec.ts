import { expect, it, vi } from 'vitest'
import { VoiceSupervisor } from '../src/host/voice-supervisor.ts'

it('requires explicit selection and a fresh spoken user turn for execution', async () => {
  const submit = vi.fn(async () => ({ status: 'accepted' }))
  const directory = { find: async () => ({ taskId: 's1' }) }
  const supervisor = new VoiceSupervisor('c1', directory as never, { select: vi.fn(), submit, cancel: vi.fn() })
  expect(await supervisor.execute('submit_voice_task', '{"instruction":"执行"}')).toMatchObject({ status: 'needs-selection' })
  await supervisor.execute('select_voice_task', '{"taskId":"s1"}')
  expect(await supervisor.execute('submit_voice_task', '{"instruction":"执行"}')).toMatchObject({ status: 'needs-clarification' })
  supervisor.userTurn('u1', '在测试目录创建 hello.txt')
  await supervisor.execute('submit_voice_task', '{"instruction":"创建 hello.txt"}')
  await supervisor.execute('submit_voice_task', '{"instruction":"创建 hello.txt"}')
  expect(submit).toHaveBeenCalledTimes(1)
  expect(await supervisor.execute('submit_voice_task', '{"instruction":"删除文件"}')).toMatchObject({ status: 'needs-clarification' })
})

it('never translates an ambiguous oral report request into file work', async () => {
  const submit = vi.fn()
  const supervisor = new VoiceSupervisor('c', { find: async () => ({ taskId: 's' }) } as never,
    { select: vi.fn(), submit, cancel: vi.fn() })
  await supervisor.execute('select_voice_task', '{"taskId":"s"}')
  supervisor.userTurn('u', '汇报啊')
  expect(await supervisor.execute('submit_voice_task', '{"instruction":"把两份汇报合并"}')).toMatchObject({ status: 'needs-clarification' })
  expect(submit).not.toHaveBeenCalled()
})
