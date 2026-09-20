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
import type { PendingVoiceApproval, PendingVoiceQuestion } from './dsh-coordinator.ts'
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
  status: VoiceInboxStatus | 'needs-input'
  /** `needs-input` entries ask a question; everything else reports a result. */
  kind?: 'report' | 'needs-input'
  /** DSH correlation id of the pending interaction, for `needs-input`. */
  interactionId?: string
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

/**
 * Host-only payload behind one `needs-input` entry.
 *
 * Kept out of the wire entry on purpose: the browser needs the prompt and the
 * correlation id, not the full DSH question shape. Only the host re-registers
 * the interaction after a hang-up, and only the host resolves it.
 */
export type VoicePendingInteraction =
  | { kind: 'approval'; sessionId: string; approval: PendingVoiceApproval; prompt: string }
  | { kind: 'question'; sessionId: string; question: PendingVoiceQuestion; prompt: string }

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
  /** Full interaction payloads behind the `needs-input` entries. */
  private readonly pending = new Map<string, VoicePendingInteraction>()
  /**
   * Interactions a live call already owns.
   *
   * The live surface asks these out loud itself, so ringing the user back
   * about a question they are being asked right now would just be noise. The
   * live call and the inbox read the same frame from two independent streams,
   * so suppression must survive whichever order they arrive in.
   */
  private isLiveCall: ((sessionId: string) => boolean) | undefined
  /**
   * Interactions observed while a live call owned their session.
   *
   * They are not dropped, only deferred: if the user hangs up without
   * answering, the Agent is still blocked and the voice surface is the only
   * place that can reach them. Keeping the exact entry means the ring-back
   * they get is the one they would have got had they never called at all.
   */
  private readonly deferred = new Map<string, VoiceInboxEntry>()
  /** Gives a dismissed pending interaction back to the browser answerer. */
  private delegateInteraction: ((interactionId: string) => void) | undefined
  /** Handoffs the live call already spoke, seen before or after their entry. */
  private readonly spokenHandoffs = new Set<string>()
  private titleLookup: ((sessionId: string) => Promise<string | undefined>) | undefined

  watch(input: WatchHandoffInput): void {
    this.watched.set(input.handoffId, { ...input, createdAt: Date.now() })
  }

  /**
   * Whether this session currently holds a handoff the voice surface started.
   *
   * This is the predicate that must survive a hang-up: the handoff outlives
   * the call, so "the user hung up" must not stop the Agent's question from
   * being routed to the voice surface.
   */
  watchesSession(sessionId: string): boolean {
    for (const watch of this.watched.values()) if (watch.sessionId === sessionId) return true
    return false
  }

  /**
   * Teach the inbox which sessions currently have a live voice call.
   *
   * A live call speaks its approvals and questions itself, so those must not
   * also appear in the ring-back list. Once the call ends the same pending
   * interaction becomes exactly what the user needs to be called about.
   */
  setIsLiveCall(isLiveCall: (sessionId: string) => boolean): void {
    this.isLiveCall = isLiveCall
  }

  /** Wire the exit hatch used when a pending interaction is dismissed. */
  setDelegateInteraction(delegate: (interactionId: string) => void): void {
    this.delegateInteraction = delegate
  }

  /**
   * Record that a watched handoff is blocked on the user.
   *
   * A pending approval or question is not a terminal state, so it never
   * reaches {@link completeTurn}. Without this the Agent would wait forever on
   * a decision the user cannot see, which is exactly the case for a task the
   * voice surface delegated and then stopped calling about.
   *
   * @returns the entry, or undefined when this interaction is already listed.
   */
  observeNeedsInput(input: {
    sessionId: string
    interactionId: string
    /** The prompt to speak, already formatted for the realtime model. */
    prompt: string
    request: string
    sessionTitle?: string
  }, interaction?: VoicePendingInteraction): VoiceInboxEntry | undefined {
    if (interaction !== undefined) this.pending.set(input.interactionId, interaction)
    const existing = this.entries.find(entry => entry.interactionId === input.interactionId)
    if (existing !== undefined) return undefined
    const watch = this.newestWatch(input.sessionId)
    const entry: VoiceInboxEntry = {
      // Deterministic so the two-second presence poll cannot churn the list.
      id: `inbox_needs_input_${input.interactionId}`,
      handoffId: watch?.handoffId ?? 'unknown',
      sessionId: input.sessionId,
      ...needsInputTitle(input.sessionTitle ?? watch?.sessionTitle),
      request: input.request,
      summary: input.prompt.slice(0, MAX_INBOX_SUMMARY_LENGTH),
      status: 'needs-input',
      kind: 'needs-input',
      interactionId: input.interactionId,
      createdAt: Date.now(),
      durationMs: watch === undefined ? 0 : Math.max(0, Date.now() - watch.createdAt),
      delivered: false,
    }
    // A live call is already asking this out loud, so listing it for ring-back
    // would ring the user about a question they are being asked right now.
    // Hold the exact entry instead of discarding it: hanging up without
    // answering must turn it into a ring-back, not lose the Agent's question.
    if (this.isLiveCall?.(input.sessionId) === true) {
      this.deferred.set(input.interactionId, entry)
      return undefined
    }
    this.entries.push(entry)
    while (this.entries.length > MAX_INBOX_ENTRIES) this.entries.shift()
    return { ...entry }
  }

  /**
   * List the interactions a live call deferred but never answered.
   *
   * Called when the call surface changes: every deferred interaction whose
   * session no longer owns a call is the same ring-back the user would have
   * received had they never picked up.
   *
   * @returns the entries that just became visible, oldest first.
   */
  releaseDeferred(): VoiceInboxEntry[] {
    const released: VoiceInboxEntry[] = []
    for (const [interactionId, entry] of [...this.deferred]) {
      if (this.isLiveCall?.(entry.sessionId) === true) continue
      this.deferred.delete(interactionId)
      // An answer may have landed while the call held it; never resurrect a
      // card the Agent is no longer blocked on.
      if (!this.pending.has(interactionId)) continue
      if (this.entries.some(existing => existing.interactionId === interactionId)) continue
      this.entries.push(entry)
      released.push({ ...entry })
    }
    while (this.entries.length > MAX_INBOX_ENTRIES) this.entries.shift()
    return released
  }

  /**
   * Drop a pending entry once the interaction is answered or goes away.
   *
   * @returns the removed entry, or undefined when it was not listed.
   */
  resolveNeedsInput(interactionId: string): VoiceInboxEntry | undefined {
    this.pending.delete(interactionId)
    // A deferred card is answered just like a listed one; dropping it here is
    // what stops a late answer from resurrecting a question on `list()`.
    this.deferred.delete(interactionId)
    const index = this.entries.findIndex(entry => entry.interactionId === interactionId)
    if (index === -1) return undefined
    const [removed] = this.entries.splice(index, 1)
    return removed === undefined ? undefined : { ...removed }
  }

  /** The full pending interaction behind one `needs-input` entry. */
  pendingInteraction(interactionId: string): VoicePendingInteraction | undefined {
    return this.pending.get(interactionId)
  }

  /** Pending interactions for one session, oldest first. */
  pendingForSession(sessionId: string): VoicePendingInteraction[] {
    return [...this.pending.values()].filter(value => value.sessionId === sessionId)
  }

  /** Titles are resolved lazily so a slow session list never blocks a call. */
  setTitleLookup(lookup: (sessionId: string) => Promise<string | undefined>): void {
    this.titleLookup = lookup
  }

  list(): VoiceInboxEntry[] {
    // Reading the list is the moment the ring-back surface asks "what do I owe
    // the user now", so it is also the moment a call that ended without
    // answering its own question has to hand that question back.
    this.releaseDeferred()
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
      // Dismissing a pending interaction is a refusal to answer it by voice.
      // Hand it back to the normal browser surface rather than leaving the
      // Agent blocked on a card the voice surface will never speak again.
      if (entry.interactionId !== undefined) {
        this.pending.delete(entry.interactionId)
        this.delegateInteraction?.(entry.interactionId)
      }
      removed += 1
    }
    return removed
  }

  clear(): void {
    this.entries.length = 0
    this.deferred.clear()
    this.pending.clear()
  }

  /**
   * Fold one mux frame into the queue.
   *
   * @returns the entry this frame completed, if any.
   */
  observe(frame: LegacyStreamFrame): VoiceInboxEntry | undefined {
    const payload = frame.payload as LegacyFramePayload | undefined
    if (payload === undefined) return undefined
    // Approval and question state live on the mux stream, not the durable
    // session log: they are transient interactions, so they are folded here
    // rather than in `completeTurn`.
    if (payload.type === 'approval/requested') {
      return this.observeNeedsInput({
        sessionId: payload.sessionId,
        interactionId: payload.approvalId,
        prompt: `DSH 需要你批准一次操作：工具 ${payload.toolName}${
          payload.reason === undefined ? '' : `，原因：${payload.reason}`
        }。请说明风险，并询问用户是否允许这一次。`,
        request: `批准 ${payload.toolName} 的操作`,
      }, {
        kind: 'approval',
        sessionId: payload.sessionId,
        prompt: `DSH 正在等待你批准工具 ${payload.toolName}。`,
        approval: {
          rpcId: payload.rpcId,
          approvalId: payload.approvalId,
          sessionId: payload.sessionId,
          toolName: payload.toolName,
          ...(payload.callId === undefined ? {} : { callId: payload.callId }),
          ...(payload.reason === undefined ? {} : { reason: payload.reason }),
        },
      })
    }
    if (payload.type === 'approval/resolved') {
      this.resolveNeedsInput(payload.approvalId)
      return undefined
    }
    if (payload.type === 'question/requested') {
      return this.observeNeedsInput({
        sessionId: payload.sessionId,
        interactionId: payload.rpcId,
        prompt: `DSH Agent 需要你作决定：${
          payload.questions.map(question => {
            const options = question.options?.map(option => option.label).join('、')
            return `${question.question}${options === undefined || options === '' ? '' : `（可选：${options}）`}`
          }).join('；')
        }。请自然地把这个问题问出来，等用户回答后再继续。`,
        request: '回答 Agent 的追问',
      }, {
        kind: 'question',
        sessionId: payload.sessionId,
        prompt: 'DSH Agent 正在等待你回答一个问题。',
        question: {
          rpcId: payload.rpcId,
          sessionId: payload.sessionId,
          questions: payload.questions.map(value => ({
            id: value.id,
            question: value.question,
            ...(value.detail === undefined ? {} : { detail: value.detail }),
            ...(value.header === undefined ? {} : { header: value.header }),
            ...(value.options === undefined ? {} : { options: value.options.map(option => ({ ...option })) }),
            ...(value.multiSelect === undefined ? {} : { multiSelect: value.multiSelect }),
          })),
        },
      })
    }
    if (payload.type === 'question/resolved') {
      this.resolveNeedsInput(payload.questionRpcId)
      return undefined
    }
    if (payload.type !== 'session/event') return undefined
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

/** Spread helper: `exactOptionalPropertyTypes` rejects an explicit undefined. */
function needsInputTitle(title: string | undefined): { sessionTitle?: string } {
  return title === undefined ? {} : { sessionTitle: title }
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
