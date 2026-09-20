import type { VoiceInboxEntry } from './voice-inbox.ts'

export interface StoredInbox {
  schemaVersion: 1
  entries: VoiceInboxEntry[]
}

/** The DSH domain global handle; storage location and lifecycle belong to DSH. */
export interface InboxGlobal {
  get(): unknown
  set(value: StoredInbox): Promise<void>
}

export function parseStoredInbox(raw: unknown): StoredInbox {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid voice inbox snapshot')
  const value = raw as Record<string, unknown>
  if (value.schemaVersion !== 1 || !Array.isArray(value.entries)) throw new Error('Unsupported voice inbox schema')
  const entries = value.entries.map((item: unknown): VoiceInboxEntry => {
    if (typeof item !== 'object' || item === null) throw new Error('Invalid voice inbox entry')
    const row = item as Record<string, unknown>
    for (const key of ['id', 'handoffId', 'sessionId', 'request', 'summary']) {
      if (typeof row[key] !== 'string') throw new Error('Invalid voice inbox entry')
    }
    if (!['completed', 'failed', 'cancelled', 'needs-input'].includes(String(row.status))
      || typeof row.delivered !== 'boolean' || typeof row.createdAt !== 'number'
      || !Number.isFinite(row.createdAt) || typeof row.durationMs !== 'number'
      || !Number.isFinite(row.durationMs)) throw new Error('Invalid voice inbox state')
    return {
      id: row.id as string, handoffId: row.handoffId as string, sessionId: row.sessionId as string,
      request: row.request as string, summary: row.summary as string,
      status: row.status as VoiceInboxEntry['status'], delivered: row.delivered,
      createdAt: row.createdAt, durationMs: row.durationMs,
      ...(typeof row.sessionTitle === 'string' ? { sessionTitle: row.sessionTitle } : {}),
      ...(row.snoozed === true ? { snoozed: true } : {}),
      // Transient approval ownership must never be reconstructed from disk.
      ...(row.status === 'needs-input' ? { kind: 'needs-input' as const, requiresOriginalSession: true } : {}),
    }
  })
  return { schemaVersion: 1, entries }
}

export class InboxPersistence {
  private loaded = false
  private chain = Promise.resolve()
  constructor(private readonly global: InboxGlobal) {}
  async load(): Promise<StoredInbox> {
    const result = parseStoredInbox(this.global.get())
    this.loaded = true
    return result
  }
  save(snapshot: StoredInbox): Promise<void> {
    if (!this.loaded) return Promise.reject(new Error('Voice inbox storage has not loaded safely'))
    const copy = structuredClone(snapshot)
    const write = this.chain.then(() => this.global.set(copy))
    this.chain = write.catch(() => {})
    return write
  }
}
