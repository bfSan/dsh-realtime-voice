import { expect, it, vi } from 'vitest'
import { InboxPersistence, parseStoredInbox } from '../src/host/inbox-persistence.ts'

const entry = { id: 'r1', handoffId: 'h1', sessionId: 's1', request: '测试', summary: '完成',
  status: 'completed', delivered: false, createdAt: 1, durationMs: 2 }

it('preserves delivery and never restores a live approval capability', () => {
  const snapshot = parseStoredInbox({ schemaVersion: 1, entries: [
    entry, { ...entry, id: 'r2', delivered: true },
    { ...entry, id: 'r3', status: 'needs-input', kind: 'needs-input', interactionId: 'old' },
  ] })
  expect(snapshot.entries.map(row => row.delivered)).toEqual([false, true, false])
  expect(snapshot.entries[2]).toMatchObject({ requiresOriginalSession: true })
})

it('rejects corrupt or unknown storage without writing over it', async () => {
  const set = vi.fn()
  const persistence = new InboxPersistence({ get: () => ({ schemaVersion: 9 }), set })
  await expect(persistence.load()).rejects.toThrow()
  await expect(persistence.save({ schemaVersion: 1, entries: [] })).rejects.toThrow()
  expect(set).not.toHaveBeenCalled()
})

it('serializes durable snapshots and recovers the write chain after failure', async () => {
  const values: unknown[] = []
  const persistence = new InboxPersistence({
    get: () => ({ schemaVersion: 1, entries: [] }),
    set: async value => { values.push(value) },
  })
  await persistence.load()
  await Promise.all([persistence.save({ schemaVersion: 1, entries: [entry] } as never),
    persistence.save({ schemaVersion: 1, entries: [] })])
  expect(values).toHaveLength(2)
  expect(values[1]).toEqual({ schemaVersion: 1, entries: [] })
})
