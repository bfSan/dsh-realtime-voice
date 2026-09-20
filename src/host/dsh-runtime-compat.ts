// Bridge from the legacy `apiProxy` host service (DSH 0.1.0-rc.7) to the
// services that replaced it in DSH 0.1.2+ (verified against 0.1.5-rc.2).
//
// The realtime-voice transport is unchanged: this module re-implements only
// the service surface the rest of the host code already consumes, so those
// call sites keep their shape while every read and mutation reaches the
// current authoritative runtime.
//
// Two rc.7 packages were deleted outright, so the mapping is:
//   ctx.apiProxy.sessions.list        -> ctx.sessionController.list
//   ctx.apiProxy.sessions.history     -> ctx.sessionController.page
//   ctx.apiProxy.sessions.prompt      -> ctx.sessionController.prompt
//   ctx.apiProxy.sessions.updateQueue -> ctx.sessionController.updateQueue
//   ctx.apiProxy.sessions.cancel      -> ctx.sessionController.cancel
//   ctx.apiProxy.events.host          -> Cordis `api-session/status|error`
//   ctx.apiProxy.events.mux           -> Cordis `session/event`, the control
//                                        stream, and the interaction waterfalls
//   ctx.apiProxy.respond              -> scoped `approval/request` and
//                                        `user-questions/request` waterfalls
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /**
     * Legacy voice host bridge. DSH 0.1.5 deleted the shipped service, so this
     * plugin installs its own implementation over `sessionController`.
     */
    apiProxy: LegacyApiProxy
  }

  interface Events {
    /**
     * Approval answerer waterfall, declared by `@deepseek-ai/dsh-user-approval`.
     *
     * Restated locally instead of importing that package: it is a Host-only
     * capability this plugin neither depends on nor ships, and taking it as a
     * dependency would drag a second, older DSH tree into the install. The
     * signature matches the shipped declaration exactly, so the listener below
     * stays type-checked against the real contract.
     */
    'approval/request'(request: ApprovalRequestLike, next: () => Promise<unknown>): Promise<unknown>
    /**
     * User-question answerer waterfall, declared by
     * `@deepseek-ai/dsh-user-questions`; restated locally for the same reason.
     */
    'user-questions/request'(request: UserQuestionRequestLike, next: () => Promise<unknown>): Promise<unknown>
  }
}

// One legacy `{ result }` envelope; failures are reported inside the result.
export interface LegacyResult<T> {
  result: { ok: true; value: T } | { ok: false; error: { message: string } }
}

// One structured question as the voice surface presents it. This is the same
// vocabulary the current `AskUserQuestionItem` uses, restated here because the
// legacy frame crossed the deleted rc.7 `apiProxy` boundary as plain data.
export interface LegacyQuestionItem {
  id: string
  question: string
  detail?: string
  header?: string
  options?: { label: string; description?: string }[]
  multiSelect?: boolean
}

// One pending queue occurrence in the legacy item shape the coordinator reads
// to cancel work that has not started yet.
export interface LegacyQueueItem {
  id: string
  placement: string
  rpcId?: string
  message?: { id: string; content: readonly unknown[] }
}

// One background-job row as the voice status projection reads it.
export interface LegacyJobItem {
  id: string
  label: string
  status: string
}

/**
 * One legacy mux/host frame body.
 *
 * The rc.7 union lived in the deleted `dsh-host-apiproxy` package. This is the
 * subset the voice host actually consumes, restated so both the producer here
 * and every consumer narrow on one shared `type` discriminant.
 */
export type LegacyFramePayload =
  | { type: 'host/session-status'; sessionId: string; running: boolean }
  | { type: 'host/agent-error'; sessionId: string; error: string }
  | {
      type: 'approval/requested'
      rpcId: string
      sessionId: string
      approvalId: string
      toolName: string
      callId?: string
      reason?: string
    }
  | {
      type: 'approval/resolved'
      rpcId: string
      sessionId: string
      approvalId: string
      outcome: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'
    }
  | { type: 'question/requested'; rpcId: string; sessionId: string; questions: LegacyQuestionItem[] }
  | {
      type: 'question/resolved'
      rpcId: string
      sessionId: string
      questionRpcId: string
      outcome: 'answered' | 'cancelled'
    }
  | { type: 'session/queue'; sessionId: string; items: readonly LegacyQueueItem[] }
  | { type: 'session/jobs'; sessionId: string; jobs: readonly LegacyJobItem[] }
  | { type: 'session/event'; sessionId: string; event: { type: string; seq?: number; data?: unknown } }

// Legacy streamed frame carrying the identity a response correlates to.
export interface LegacyStreamFrame {
  rpcId: string
  payload: LegacyFramePayload
}

/**
 * Correlation identity for one legacy request/response pair.
 *
 * DSH 0.1.5 dropped `RpcId` with the `apiProxy` package it lived in, but the
 * value was always just a freshly minted UUID string. Keeping the nominal
 * helper preserves the call sites' intent — an id minted here, not a session
 * or tool id — without reintroducing the deleted package.
 */
export type RpcId = string & { readonly __rpcId?: unique symbol }

/** Brand one UUID as a legacy request correlation id. */
export function RpcId(id: string): RpcId {
  return id as RpcId
}

// Minimal structural view of the current SessionController service.
interface SessionControllerLike {
  list(request: unknown, signal: AbortSignal): Promise<{ items: readonly LegacySessionSummary[] }>
  prompt(request: unknown, signal: AbortSignal): Promise<{ accepted: true }>
  updateQueue(request: unknown): { accepted: true }
  cancel(request: unknown): { accepted: true }
  page(request: unknown, signal: AbortSignal): Promise<{ records: readonly LegacyHistoryRecord[] }>
  control(signal: AbortSignal): AsyncIterable<unknown>
}

/**
 * Session row as the rc.7 host bridge consumed it. The surviving service
 * returns the same fields, so the legacy surface passes them straight through
 * while the coordinator keeps reading `sessionId`/`running`/`blank`/`cwd` and
 * `projections.values.title`.
 */
export interface LegacySessionSummary {
  sessionId: string
  running: boolean
  blank: boolean
  cwd?: string
  projections?: { values?: unknown } | undefined
}

// One durable history record; every reader narrows on `event.type` itself.
export interface LegacyHistoryRecord {
  event: unknown
}

/**
 * One interaction the voice surface is holding.
 *
 * `delegate` settles the promise as a failure so the waterfall's catch hands
 * the request back to the normal browser answerer. That is the exit hatch for
 * "user dismissed the ring-back instead of answering by voice": without it the
 * Agent would wait on a card nobody owns.
 */
interface HeldApproval {
  resolve(outcome: 'allowed-once' | 'rejected'): void
  delegate(): void
}

interface HeldQuestion {
  resolve(value: unknown): void
  delegate(): void
}

// Structural view of the two scoped waterfall requests this bridge answers.
interface InteractionRequestLike {
  agent?: { id?: unknown; session?: { id?: unknown } }
}

interface ApprovalRequestLike extends InteractionRequestLike {
  toolName?: unknown
  callId?: unknown
  reason?: unknown
}

interface UserQuestionRequestLike extends InteractionRequestLike {
  questions?: unknown
}

// Structural view of one durable session event as it crosses the bridge. The
// `session/event` listener receives the concrete `SessionEvent`, which carries
// no index signature, so the frame names only the fields consumers read.
interface SessionEventLike {
  type: string
  seq?: number
  data?: unknown
}

// The compatibility surface installed as `ctx.apiProxy`.
//
// `respond()` reports `accepted: false` for an unknown rpcId instead of
// throwing, because the coordinator treats a rejected receipt as "no longer
// pending" — the correct outcome for a stale card.
export interface LegacyApiProxy {
  sessions: {
    list(request: { rpcId: string; payload: unknown }): Promise<LegacyResult<{ items: readonly LegacySessionSummary[] }>>
    history(request: { rpcId: string; payload: { sessionId: SessionId; maxMessages?: number } }): Promise<LegacyResult<{ events: readonly { event: unknown }[] }>>
    prompt(request: { rpcId: string; payload: { sessionId: SessionId; mode: 'queue' | 'steer'; content: readonly unknown[] } }): Promise<LegacyResult<{ accepted: true }>>
    updateQueue(request: { rpcId: string; payload: { sessionId: SessionId; itemId: never; action: { kind: 'remove' } } }): Promise<LegacyResult<{ accepted: true }>>
    cancel(request: { rpcId: string; payload: { sessionId: SessionId } }): Promise<LegacyResult<{ accepted: true }>>
  }
  events: {
    host(request: { rpcId: string; payload: unknown }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>
    mux(request: { rpcId: string; payload: unknown }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>
  }
  respond(envelope: { type: 'client-response'; rpcId: string; result: unknown }): Promise<{ accepted: boolean; reason?: string }>
}

export interface InstallCompatOptions {
  // Restricts interaction waterfalls to sessions that currently own a voice
  // call. Outside a call the browser keeps its own approval and question UI.
  isVoiceSession?: (sessionId: string) => boolean
  /**
   * Sessions with an outstanding voice handoff.
   *
   * A handoff outlives the call that started it, so a question raised after
   * the user hung up must still reach the voice surface - that is the only way
   * they can learn the Agent is blocked. The voice surface owns the answer
   * here, exactly as it does during a live call.
   */
  watchesHandoff?: (sessionId: string) => boolean
  // Overrides the registered service name; used by tests.
  serviceName?: string
}

/** Handle on the interaction routing this shim installed. */
export interface CompatInteractionControl {
  /**
   * Hand one pending interaction back to the normal browser surface.
   *
   * Called when the user dismisses a ring-back instead of answering it by
   * voice: the Agent must not wait forever on a card nobody owns.
   */
  delegateInteraction(interactionId: string): boolean
}

// Install the compatibility service on the calling fiber. Registration is an
// effect, so unloading the plugin removes the shim with everything else.
export function installApiProxyCompat(ctx: Context, options: InstallCompatOptions = {}): CompatInteractionControl {
  const serviceName = options.serviceName ?? 'apiProxy'
  const control: CompatInteractionControl = {
    delegateInteraction: () => false,
  }
  ctx.inject(['sessionController'], (sessionCtx) => {
    const controller = getService<SessionControllerLike>(sessionCtx, 'sessionController')
    if (controller === undefined) {
      ctx.logger.warn('[realtime-voice] sessionController is unavailable; voice host bridge is disabled')
      return
    }
    const approvals = new Map<string, HeldApproval>()
    const questions = new Map<string, HeldQuestion>()
    const hub = new LiveEventHub(sessionCtx, {
      controller,
      approvals,
      questions,
      ...(options.isVoiceSession === undefined ? {} : { isVoiceSession: options.isVoiceSession }),
      ...(options.watchesHandoff === undefined ? {} : { watchesHandoff: options.watchesHandoff }),
    })
    hub.start()
    control.delegateInteraction = interactionId => hub.delegateInteraction(interactionId)

    const ok = <T>(value: T): LegacyResult<T> => ({ result: { ok: true, value } })
    const fail = <T>(error: unknown): LegacyResult<T> => ({ result: { ok: false, error: { message: errorText(error) } } })

    const apiProxy: LegacyApiProxy = {
      sessions: {
        async list() {
          try {
            const page = await controller.list({}, new AbortController().signal)
            return ok({ items: page.items })
          } catch (error) {
            return fail(error)
          }
        },
        async history(request) {
          try {
            const { sessionId, maxMessages } = request.payload
            const page = await controller.page({
              address: { kind: 'session', sessionId: String(sessionId) },
              throughSeq: -1,
              ...(maxMessages === undefined ? {} : { maxMessages }),
            }, new AbortController().signal)
            return ok({ events: page.records.map(toLegacyHistoryEntry) })
          } catch (error) {
            return fail(error)
          }
        },
        async prompt(request) {
          try {
            const { sessionId, mode, content } = request.payload
            await controller.prompt({
              requestId: request.rpcId,
              sessionId: String(sessionId),
              mode,
              content,
            }, new AbortController().signal)
            return ok({ accepted: true })
          } catch (error) {
            return fail(error)
          }
        },
        async updateQueue(request) {
          try {
            const { sessionId, itemId, action } = request.payload
            controller.updateQueue({ sessionId: String(sessionId), itemId, action })
            return ok({ accepted: true })
          } catch (error) {
            return fail(error)
          }
        },
        async cancel(request) {
          try {
            controller.cancel({ sessionId: String(request.payload.sessionId) })
            return ok({ accepted: true })
          } catch (error) {
            return fail(error)
          }
        },
      },
      events: {
        host: (_request, signal) => hub.hostFrames(signal),
        mux: (_request, signal) => hub.muxFrames(signal),
      },
      async respond(envelope) {
        const approval = approvals.get(envelope.rpcId)
        if (approval !== undefined) {
          approvals.delete(envelope.rpcId)
          const outcome = approvalOutcomeOf(envelope.result)
          if (outcome === undefined) return { accepted: false, reason: 'unsupported approval outcome' }
          approval.resolve(outcome)
          return { accepted: true }
        }
        const question = questions.get(envelope.rpcId)
        if (question !== undefined) {
          questions.delete(envelope.rpcId)
          question.resolve(questionAnswersOf(envelope.result))
          return { accepted: true }
        }
        return { accepted: false, reason: 'response is no longer pending' }
      },
    }

    ctx.provide(serviceName, apiProxy as never)
    ctx.effect(() => () => {
      hub.stop()
      control.delegateInteraction = () => false
    }, 'realtime-voice: legacy event hub lifecycle')
  })
  return control
}

interface HubServices {
  controller: SessionControllerLike
  approvals: Map<string, HeldApproval>
  questions: Map<string, HeldQuestion>
  isVoiceSession?: ((sessionId: string) => boolean) | undefined
  watchesHandoff?: ((sessionId: string) => boolean) | undefined
}

// One fan-out of the current runtime's Cordis events and control stream into
// the legacy host/mux frame vocabulary. Queues are never backfilled: a slow
// consumer observes current state rather than a replay of stale turns.
class LiveEventHub {
  private readonly hostQueues = new Set<FrameQueue>()
  private readonly muxQueues = new Set<FrameQueue>()
  private readonly disposers: (() => void)[] = []
  private readonly controlAbort = new AbortController()
  private controlRetry: ReturnType<typeof setTimeout> | undefined
  private stopped = false

  constructor(private readonly ctx: Context, private readonly services: HubServices) {}

  start(): void {
    // Status frames the voice host derives Agent work from.
    this.disposers.push(this.ctx.on('api-session/status', ((sessionId: string, running: boolean) => {
      this.pushHost({ type: 'host/session-status', sessionId, running })
    }) as never))
    this.disposers.push(this.ctx.on('api-session/error', ((sessionId: string, error: unknown) => {
      this.pushHost({ type: 'host/agent-error', sessionId, error: errorText(error) })
    }) as never))

    // Durable session events drive the transcript projection and the
    // authoritative terminal state the voice surface announces.
    this.disposers.push(this.ctx.on('session/event', ((session: { id?: unknown }, event: SessionEventLike) => {
      const sessionId = session?.id
      if (typeof sessionId !== 'string') return
      this.pushMux({ type: 'session/event', sessionId, event })
    }) as never))

    // Queues and jobs arrive on the same control stream the browser reads, so
    // a pending handoff can be canceled by the exact identity it was admitted
    // as and background work still counts as Agent work.
    this.followControl()

    // Approvals and questions are scoped waterfalls. Voice joins the same
    // chain the browser uses, but only while it owns a call for that session;
    // otherwise it defers so the normal DSH UI answers.
    //
    // `prepend` is load-bearing, not an optimization. `waterfall` runs
    // listeners outermost-first in registration order and a listener that does
    // not call `next()` vetoes the rest of the chain. The desktop profile
    // loads `dsh-web-app` before this plugin, and `@deepseek-ai/dsh-api-remotes`
    // registers the browser answerer from there, so without `prepend` the
    // browser claims every request first and parks it on a surface the user
    // walked away from. Prepending only changes order: a session voice does
    // not own still falls straight through to the browser answerer via
    // `next()` below.
    //
    // Arrow listeners keep `this` bound to the hub: Cordis binds each listener
    // to its dispatch context, which would otherwise replace the instance.
    this.disposers.push(this.ctx.on('approval/request', (async (
      request: ApprovalRequestLike,
      next: () => Promise<unknown>,
    ): Promise<unknown> => {
      const sessionId = agentSessionId(request)
      if (sessionId === undefined || !this.ownsInteraction(sessionId)) return next()
      const rpcId = randomUUID()
      const pending = new Promise<'allowed-once' | 'rejected'>((resolve, reject) => {
        this.services.approvals.set(rpcId, { resolve, delegate: () => reject(new Error('voice interaction delegated')) })
      })
      this.pushMux({
        type: 'approval/requested',
        rpcId,
        sessionId,
        approvalId: rpcId,
        toolName: typeof request.toolName === 'string' ? request.toolName : 'unknown',
        ...(request.callId === undefined ? {} : { callId: String(request.callId) }),
        ...(request.reason === undefined ? {} : { reason: String(request.reason) }),
      }, rpcId)
      try {
        const outcome = await pending
        this.pushMux({ type: 'approval/resolved', rpcId, sessionId, approvalId: rpcId, outcome }, rpcId)
        return outcome
      } catch {
        return next()
      }
    }) as never, { prepend: true }))

    this.disposers.push(this.ctx.on('user-questions/request', (async (
      request: UserQuestionRequestLike,
      next: () => Promise<unknown>,
    ): Promise<unknown> => {
      const sessionId = agentSessionId(request)
      if (sessionId === undefined || !this.ownsInteraction(sessionId)) return next()
      const rpcId = randomUUID()
      const pending = new Promise<unknown>((resolve, reject) => {
        this.services.questions.set(rpcId, { resolve, delegate: () => reject(new Error('voice interaction delegated')) })
      })
      this.pushMux({
        type: 'question/requested',
        rpcId,
        sessionId,
        questions: toLegacyQuestions(request.questions),
      }, rpcId)
      try {
        const value = await pending
        this.pushMux({ type: 'question/resolved', rpcId, sessionId, questionRpcId: rpcId, outcome: 'answered' }, rpcId)
        return value
      } catch {
        return next()
      }
    }) as never, { prepend: true }))
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    this.controlAbort.abort()
    if (this.controlRetry !== undefined) clearTimeout(this.controlRetry)
    this.controlRetry = undefined
    for (const dispose of this.disposers.splice(0)) dispose()
    for (const queue of [...this.hostQueues, ...this.muxQueues]) queue.end()
    this.hostQueues.clear()
    this.muxQueues.clear()
    this.services.approvals.clear()
    this.services.questions.clear()
  }

  hostFrames(signal: AbortSignal): AsyncIterable<LegacyStreamFrame> {
    return this.subscribe(this.hostQueues, signal)
  }

  muxFrames(signal: AbortSignal): AsyncIterable<LegacyStreamFrame> {
    return this.subscribe(this.muxQueues, signal)
  }

  /**
   * Give one held interaction back to the normal browser answerer.
   *
   * @returns whether the interaction was still pending under this hub.
   */
  delegateInteraction(interactionId: string): boolean {
    const approval = this.services.approvals.get(interactionId)
    if (approval !== undefined) {
      this.services.approvals.delete(interactionId)
      approval.delegate()
      return true
    }
    const question = this.services.questions.get(interactionId)
    if (question !== undefined) {
      this.services.questions.delete(interactionId)
      question.delegate()
      return true
    }
    return false
  }

  /**
   * Voice answers an interaction when it owns the live call, and also when it
   * still holds an outstanding handoff for that session.
   *
   * The second case is what makes a ring-back possible: the user hung up, the
   * Agent kept working, and it now blocks on a decision. Answering as the
   * browser would leave the pending card waiting on a surface nobody is
   * watching once the voice surface has already listed it for ring-back.
   */
  private ownsInteraction(sessionId: string): boolean {
    try {
      return this.services.isVoiceSession?.(sessionId) === true
        || this.services.watchesHandoff?.(sessionId) === true
    } catch {
      return false
    }
  }

  // The control stream is Host-wide: one subscription carries every Session's
  // queue and job rows, which is exactly the shape the legacy mux frames had.
  private followControl(): void {
    void (async () => {
      for await (const frame of this.services.controller.control(this.controlAbort.signal)) {
        this.projectControlFrame(frame)
      }
    })().catch((error: unknown) => {
      if (!this.controlAbort.signal.aborted) this.ctx.logger.warn(error)
    }).finally(() => {
      if (this.stopped || this.controlAbort.signal.aborted || this.controlRetry !== undefined) return
      this.controlRetry = setTimeout(() => {
        this.controlRetry = undefined
        if (!this.stopped && !this.controlAbort.signal.aborted) this.followControl()
      }, 1_000)
      this.controlRetry.unref?.()
    })
  }

  private projectControlFrame(frame: unknown): void {
    if (typeof frame !== 'object' || frame === null) return
    const value = frame as Record<string, unknown>
    if (value.type === 'baseline') {
      const baseline = value.value as { queues?: Record<string, unknown>; jobs?: Record<string, unknown> } | undefined
      for (const [sessionId, items] of Object.entries(baseline?.queues ?? {})) {
        this.pushMux({ type: 'session/queue', sessionId, items: Array.isArray(items) ? items : [] })
      }
      for (const [sessionId, jobs] of Object.entries(baseline?.jobs ?? {})) {
        this.pushMux({ type: 'session/jobs', sessionId, jobs: Array.isArray(jobs) ? jobs : [] })
      }
      return
    }
    if (typeof value.sessionId !== 'string') return
    if (value.type === 'queue') {
      this.pushMux({
        type: 'session/queue',
        sessionId: value.sessionId,
        items: Array.isArray(value.items) ? value.items : [],
      })
      return
    }
    if (value.type === 'jobs') {
      this.pushMux({
        type: 'session/jobs',
        sessionId: value.sessionId,
        jobs: Array.isArray(value.jobs) ? value.jobs : [],
      })
    }
  }

  private subscribe(queues: Set<FrameQueue>, signal: AbortSignal): AsyncIterable<LegacyStreamFrame> {
    const queue = new FrameQueue()
    queues.add(queue)
    const detach = () => {
      queues.delete(queue)
      queue.end()
    }
    signal.addEventListener('abort', detach, { once: true })
    if (signal.aborted) detach()
    return queue.iterate(signal, detach)
  }

  private pushHost(payload: LegacyFramePayload, rpcId = randomUUID()): void {
    for (const queue of this.hostQueues) queue.push({ rpcId, payload })
  }

  private pushMux(payload: LegacyFramePayload, rpcId = randomUUID()): void {
    for (const queue of this.muxQueues) queue.push({ rpcId, payload })
  }
}

// One pull-driven queue bridging synchronous listeners to an async iterator.
class FrameQueue {
  private readonly buffer: LegacyStreamFrame[] = []
  private waiter: (() => void) | undefined
  private done = false

  push(frame: LegacyStreamFrame): void {
    if (this.done) return
    this.buffer.push(frame)
    this.waiter?.()
    this.waiter = undefined
  }

  end(): void {
    if (this.done) return
    this.done = true
    this.waiter?.()
    this.waiter = undefined
  }

  // Each consumer owns its own async iterator over the shared buffer; the
  // abort signal ends that consumer without disturbing its siblings.
  iterate(signal: AbortSignal, detach: () => void): AsyncIterable<LegacyStreamFrame> {
    const queue = this
    return {
      [Symbol.asyncIterator]() {
        return (async function* () {
          try {
            while (true) {
              while (queue.buffer.length > 0) yield queue.buffer.shift() as LegacyStreamFrame
              if (queue.done || signal.aborted) return
              await new Promise<void>((resolve) => { queue.waiter = resolve })
            }
          } finally {
            signal.removeEventListener('abort', detach)
            detach()
          }
        })()
      },
    }
  }
}

function getService<T>(ctx: Context, name: string): T | undefined {
  try {
    return ctx.get(name) as T | undefined
  } catch {
    return undefined
  }
}

// Read the owning Agent's session id out of a scoped waterfall request.
function agentSessionId(request: InteractionRequestLike): string | undefined {
  const agent = request.agent
  const id = agent?.id ?? agent?.session?.id
  return typeof id === 'string' && id !== '' ? id : undefined
}

// Narrow the untrusted wire question list onto the vocabulary the voice
// surface renders. A malformed entry is dropped rather than surfaced, because
// a partial card the user cannot answer is worse than a missing one.
function toLegacyQuestions(value: unknown): LegacyQuestionItem[] {
  if (!Array.isArray(value)) return []
  const questions: LegacyQuestionItem[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const question = entry as Record<string, unknown>
    if (typeof question.id !== 'string' || typeof question.question !== 'string') continue
    const options = Array.isArray(question.options)
      ? question.options.flatMap((option): { label: string; description?: string }[] => {
          if (typeof option !== 'object' || option === null) return []
          const value = option as Record<string, unknown>
          if (typeof value.label !== 'string') return []
          return [{
            label: value.label,
            ...(typeof value.description === 'string' ? { description: value.description } : {}),
          }]
        })
      : undefined
    questions.push({
      id: question.id,
      question: question.question,
      ...(typeof question.detail === 'string' ? { detail: question.detail } : {}),
      ...(typeof question.header === 'string' ? { header: question.header } : {}),
      ...(options === undefined ? {} : { options }),
      ...(question.multiSelect === true ? { multiSelect: true } : {}),
    })
  }
  return questions
}

// Map one durable wire record onto the legacy history entry shape.
function toLegacyHistoryEntry(record: unknown): { event: unknown } {
  if (typeof record === 'object' && record !== null && 'event' in record) {
    return { event: (record as { event: unknown }).event }
  }
  return { event: record }
}

// Extract the approval outcome from a legacy client-response envelope.
function approvalOutcomeOf(result: unknown): 'allowed-once' | 'rejected' | undefined {
  const outcome = (unwrapResponseValue(result) as { outcome?: unknown } | undefined)?.outcome
  if (outcome === 'allowed-once' || outcome === 'rejected') return outcome
  return undefined
}

// Extract the answered questions from a legacy client-response envelope.
function questionAnswersOf(result: unknown): { answers: readonly unknown[] } {
  const answer = (unwrapResponseValue(result) as { answer?: { answers?: unknown } } | undefined)?.answer
  const answers = answer?.answers
  return { answers: Array.isArray(answers) ? answers : [] }
}

function unwrapResponseValue(result: unknown): unknown {
  if (typeof result !== 'object' || result === null) return undefined
  // The legacy client-response carries one RpcResult (`{ ok, value }`) as its
  // `result`. Tolerate one further `result` wrapper so a caller that passes the
  // whole envelope reads the same value.
  const value = (result as Record<string, unknown>).value
  if (value !== undefined) return value
  const inner = (result as Record<string, unknown>).result as Record<string, unknown> | undefined
  return inner?.value
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
