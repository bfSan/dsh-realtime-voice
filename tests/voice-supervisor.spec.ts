import { expect, it, vi } from 'vitest'
import { VoiceSupervisor } from '../src/host/voice-supervisor.ts'
import { ButlerRegistry } from '../src/host/butler-registry.ts'

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

it('routes butler roster, scope and todo calls to the roster instead of DSH work', async () => {
  const submit = vi.fn()
  const registry = new ButlerRegistry()
  const butler = registry.create('运维')
  const supervisor = new VoiceSupervisor('c', { find: async () => ({ taskId: 's' }) } as never,
    { select: vi.fn(), submit, cancel: vi.fn() }, registry as never, butler.id)
  expect(await supervisor.execute('list_voice_butlers', '{}')).toMatchObject({ butlers: [{ id: butler.id, name: '运维' }] })
  expect(await supervisor.execute('remember_voice_scope', '{"note":"负责日志清理"}')).toMatchObject({ status: 'remembered' })
  expect(await supervisor.execute('note_voice_todo', '{"note":"每周一清理日志"}')).toMatchObject({ status: 'noted' })
  expect(registry.get(butler.id)?.scope.keywords).toEqual(['负责日志清理'])
  expect(registry.get(butler.id)?.memory.notes).toEqual(['每周一清理日志'])
  expect(submit).not.toHaveBeenCalled()
})

it('switches butler mid-call and reports the new identity once', async () => {
  const registry = new ButlerRegistry()
  const ops = registry.create('运维')
  const writer = registry.create('写作')
  const supervisor = new VoiceSupervisor('c', { find: async () => ({ taskId: 's' }) } as never,
    { select: vi.fn(), submit: vi.fn(), cancel: vi.fn() }, registry as never, ops.id)
  expect(await supervisor.execute('list_voice_butlers', '{}')).toMatchObject({ current: ops.id })
  const switched = await supervisor.execute('switch_voice_butler', `{"butlerId":"${writer.id}"}`) as { status: string; butler: { id: string }; briefing: string }
  expect(switched.status).toBe('switched')
  expect(switched.butler.id).toBe(writer.id)
  expect(switched.briefing).toContain('写作')
  expect(supervisor.butlerId).toBe(writer.id)
  expect(() => { (supervisor.butlerId as string) }).not.toThrow()
  await expect(supervisor.execute('switch_voice_butler', '{"butlerId":"ghost"}')).rejects.toThrow()
})
