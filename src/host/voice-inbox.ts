/**
 * Root-lifetime call-back inbox.
 *
 * A voice handoff usually outlives the call that started it: the user hangs
 * up, the Agent keeps working, and the result has nowhere to land. This module
 * watches exactly the handoffs a live call delegated, and turns their terminal
 * DSH turn into one queue entry the browser can ring back and read aloud.
 *
 * The subscription is global and cheap (the hub fans frames out to every
 * consumer), but entries are only produced for watched handoffs, so unrelated
 * sessions in the same DSH instance never appear in the list.
 */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { RpcId, type LegacyFramePayload, type LegacyStreamFrame } from './dsh-runtime-compat.ts'
import { assistantText } from './dsh-session-state.ts'

export const MAX_INBOX_ENTRIES = 20
/** One spoken report cannot carry an unbounded summary. */
export const MAX_INBOX_SUMMARY_LENGTH = 1_200

export type VoiceInboxStatus = 'completed' | 'failed' | 'cancelled'

export interface VoiceInboxEntry {
  id: string
  handoffId: string
  sessionId: string
  sessionTitle?: string
  /** The delegated instruction, as the user's agent received it. */
  request: string
  /** Final assistant text, already trimmed for speech. */
  summary: string
  status: VoiceInboxStatus
  createdAt: number
  /** How long the delegated turn ran, used to skip ringing for short tasks. */
  durationMs: number
  /** True once the voice surface has spoken this report. */
  delivered: boolean
}

export interface WatchHandoffInput {
  handoffId: string
  sessionId: string
  request: string
  sessionTitle?: string
}

interface WatchedHandoff extends WatchHandoffInput {
  createdAt: number
}

export interface VoiceInboxSource {
  mux(request: { rpcId: string; payload: unknown }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>
}

/**
 * Bounded, in-memory call-back queue.
 *
 * Nothing here is a durable record: DSH still owns the authoritative
 * transcript, and the entry only exists so the voice surface can offer
 * "N 条任务已完成，要不要现在听汇报".
 */
export class VoiceInbox {
  private readonly entries: VoiceInboxEntry[] = []
  private readonly watched = new Map<string, WatchedHandoff>()
  private readonly pendingAssistant = new Map<string, string>()
  /** Handoffs the live call already spoke, seen before or after their entry. */
  private readonly spokenHandoffs = new Set<string>()
  private titleLookup: ((sessionId: string) => Promise<string | undefined>) | undefined

  watch(input: WatchHandoffInput): void {
    this.watched.set(input.handoffId, { ...input, createdAt: Date.now() })
  }

  /** Titles are resolved lazily so a slow session list never blocks a call. */
  setTitleLookup(lookup: (sessionId: string) => Promise<string | undefined>): void {
    this.titleLookup = lookup
  }

  list(): VoiceInboxEntry[] {
    return this.entries.map(entry => ({ ...entry }))
  }

  /** Entries the voice surface still owes the user. */
  undelivered(): VoiceInboxEntry[] {
    return this.list().filter(entry => !entry.delivered)
  }

  markDelivered(ids: readonly string[]): VoiceInboxEntry[] {
    const wanted = new Set(ids)
    const delivered: VoiceInboxEntry[] = []
    for (const entry of this.entries) {
      if (!wanted.has(entry.id) || entry.delivered) continue
      entry.delivered = true
      delivered.push({ ...entry })
    }
    return delivered
  }

  /**
   * Mark the entry for one handoff as already reported. Used when the task
   * finished while the user was still on the call: the live surface spoke the
   * result, so ringing them back about it would repeat the same news.
   */
  markHandoffDelivered(handoffId: string): VoiceInboxEntry | undefined {
    const entry = this.entries.find(candidate => candidate.handoffId === handoffId)
    if (entry === undefined) {
      // The live call and the inbox read two independent streams of the same
      // frame, so the spoken marker can arrive first; remember it so the entry
      // is created already delivered.
      if (this.watched.has(handoffId)) this.spokenHandoffs.add(handoffId)
      return undefined
    }
    if (entry.delivered) return undefined
    entry.delivered = true
    return { ...entry }
  }

  dismiss(ids: readonly string[]): number {
    const wanted = new Set(ids)
    let removed = 0
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index]
      if (entry === undefined || !wanted.has(entry.id)) continue
      this.entries.splice(index, 1)
      removed += 1
    }
    return removed
  }

  clear(): void {
    this.entries.length = 0
  }

  /**
   * Fold one mux frame into the queue.
   *
   * @returns the entry this frame completed, if any.
   */
  observe(frame: LegacyStreamFrame): VoiceInboxEntry | undefined {
    const payload = frame.payload as LegacyFramePayload | undefined
    if (payload?.type !== 'session/event') return undefined
    const { sessionId, event } = payload
    if (typeof sessionId !== 'string' || typeof event !== 'object' || event === null) return undefined
    const typed = event as { type?: unknown; data?: unknown; seq?: unknown }
    if (typed.type === 'assistant/message') {
      const data = typed.data as Record<string, unknown> | undefined
      const turn = data?.turn
      const text = assistantText(typed)
      if (typeof turn === 'number' && text !== undefined) {
        this.pendingAssistant.set(`${sessionId}:${turn}`, text)
      }
      return undefined
    }
    if (typed.type !== 'turn/end') return undefined
    const data = typed.data as Record<string, unknown> | undefined
    const turn = data?.turn
    if (typeof turn !== 'number') return undefined
    const key = `${sessionId}:${turn}`
    const summary = this.pendingAssistant.get(key)
    this.pendingAssistant.delete(key)
    return this.completeTurn(sessionId, turnEndStatus(data?.reason), summary)
  }

  private completeTurn(
    sessionId: string,
    status: VoiceInboxStatus,
    summary: string | undefined,
  ): VoiceInboxEntry | undefined {
    const watch = this.newestWatch(sessionId)
    if (watch === undefined) return undefined
    this.watched.delete(watch.handoffId)
    const alreadySpoken = this.spokenHandoffs.delete(watch.handoffId)
    const now = Date.now()
    const entry: VoiceInboxEntry = {
      id: `inbox_${randomUUID()}`,
      handoffId: watch.handoffId,
      sessionId,
      ...(watch.sessionTitle === undefined ? {} : { sessionTitle: watch.sessionTitle }),
      request: watch.request,
      summary: (summary ?? fallbackSummary(status)).slice(0, MAX_INBOX_SUMMARY_LENGTH),
      status,
      createdAt: watch.createdAt,
      durationMs: Math.max(0, now - watch.createdAt),
      delivered: alreadySpoken,
    }
    this.entries.push(entry)
    while (this.entries.length > MAX_INBOX_ENTRIES) this.entries.shift()
    const titleLookup = this.titleLookup
    if (titleLookup !== undefined && entry.sessionTitle === undefined) {
      // Best effort: the ring must not wait on the session list.
      void titleLookup(sessionId).then((title) => {
        if (title !== undefined) entry.sessionTitle = title
      }).catch(() => {})
    }
    return { ...entry }
  }

  /** One handoff per session at a time; a second watch replaces the first. */
  private newestWatch(sessionId: string): WatchedHandoff | undefined {
    let newest: WatchedHandoff | undefined
    for (const watch of this.watched.values()) {
      if (watch.sessionId !== sessionId) continue
      if (newest === undefined || watch.createdAt >= newest.createdAt) newest = watch
    }
    return newest
  }
}

function turnEndStatus(reason: unknown): VoiceInboxStatus {
  const kind = turnEndKind(reason)
  if (kind === 'cancelled') return 'cancelled'
  if (kind === 'failed') return 'failed'
  return 'completed'
}

/** Same reason vocabulary the live call uses, so ring-back and speech agree. */
function turnEndKind(value: unknown): 'completed' | 'cancelled' | 'failed' {
  const kind = typeof value === 'string'
    ? value
    : typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).kind === 'string'
      ? (value as Record<string, unknown>).kind as string
      : 'completed'
  if (kind === 'aborted' || kind === 'interrupted' || kind === 'cancelled') return 'cancelled'
  if (kind === 'error' || kind === 'blocked' || kind === 'max-tokens' || kind === 'failed') return 'failed'
  return 'completed'
}

function fallbackSummary(status: VoiceInboxStatus): string {
  if (status === 'cancelled') return '任务已取消。'
  if (status === 'failed') return '任务执行失败，请查看绑定任务中的详情。'
  return '任务已完成。'
}

export interface StartVoiceInboxOptions {
  /** Overrides the session-title lookup; used by tests. */
  titleLookup?: (sessionId: string) => Promise<string | undefined>
}

/**
 * Follow the global mux stream for as long as the plugin is loaded.
 *
 * @returns a disposer that stops the subscription.
 */
export function startVoiceInbox(
  ctx: Context,
  inbox: VoiceInbox,
  options: StartVoiceInboxOptions = {},
): () => void {
  const abort = new AbortController()
  const lookup = options.titleLookup ?? (async (sessionId: string) => {
    const response = await ctx.apiProxy.sessions.list({ rpcId: RpcId(randomUUID()), payload: {} })
    if (!response.result.ok) return undefined
    const item = response.result.value.items.find(candidate => candidate.sessionId === sessionId)
    return item === undefined ? undefined : projectionTitle(item.projections?.values)
  })
  inbox.setTitleLookup(lookup)
  void (async () => {
    for await (const frame of ctx.apiProxy.events.mux({ rpcId: RpcId(randomUUID()), payload: {} }, abort.signal)) {
      inbox.observe(frame)
    }
  })().catch((error: unknown) => {
    if (!abort.signal.aborted) ctx.logger?.warn?.(`[realtime-voice] inbox stream stopped: ${String(error)}`)
  })
  return () => { abort.abort() }
}

function projectionTitle(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const title = (value as Record<string, unknown>).title
  if (typeof title === 'string' && title.trim() !== '') return title.trim()
  if (typeof title !== 'object' || title === null) return undefined
  const nested = (title as Record<string, unknown>).title
  return typeof nested === 'string' && nested.trim() !== '' ? nested.trim() : undefined
}
