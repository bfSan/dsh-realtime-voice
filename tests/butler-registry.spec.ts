import { expect, it } from 'vitest'
import { ButlerRegistry, buildButlerBriefing } from '../src/host/butler-registry.ts'
import { butlerStorageSpec } from '../src/host/butler-persistence.ts'

it('rejects null globals and uses a legal domain name', () => {
  expect(butlerStorageSpec.name).toBe('realtime_voice_butlers')
  expect(butlerStorageSpec.global.schema.safeParse(null).success).toBe(false)
  expect(butlerStorageSpec.global.schema.safeParse({ schemaVersion: 1, butlers: [] }).success).toBe(true)
})

it('creates butlers, keeps the first as default and remembers one task per butler', () => {
  const registry = new ButlerRegistry()
  const a = registry.create('运维')
  const b = registry.create('写作')
  expect(registry.defaultId()).toBe(a.id)
  registry.touch(a.id, { sessionId: 's1', title: '清理日志', lastTouchedAt: 1, lastSummary: '已删除 3 个旧日志' })
  registry.touch(b.id, { sessionId: 's2', title: '写周报', lastTouchedAt: 2, lastSummary: '已写完初稿' })
  expect(registry.get(a.id)?.memory.tasks.map(row => row.sessionId)).toEqual(['s1'])
  expect(registry.get(b.id)?.memory.tasks.map(row => row.sessionId)).toEqual(['s2'])
})

it('keeps briefings separate and free of other butlers', () => {
  const registry = new ButlerRegistry()
  const a = registry.create('运维')
  registry.touch(a.id, { sessionId: 's1', title: '清理日志', lastTouchedAt: 1, lastSummary: '已删除 3 个旧日志' })
  const b = registry.create('写作')
  const brief = buildButlerBriefing(registry.get(b.id)!)
  expect(brief).toContain('写作')
  expect(brief).not.toContain('清理日志')
})
