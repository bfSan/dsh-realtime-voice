import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { installApiProxyCompat } from '../src/host/dsh-runtime-compat.ts'

type Listener = (...args: never[]) => unknown

/**
 * Minimal Cordis face: the shim only needs `inject`, `on`, `provide`, `effect`,
 * and `get`. Returning the disposers lets the test prove the plugin really
 * detaches its interaction listeners.
 */
function createContext(controller: unknown) {
  const listeners = new Map<string, Listener[]>()
  const disposers: (() => void)[] = []
  const context = {
    logger: { warn: vi.fn(), info: vi.fn() },
    inject: vi.fn((names: readonly string[], body: (ctx: unknown) => void) => {
      if (names.includes('sessionController')) body(context)
    }),
    get: vi.fn((name: string) => (name === 'sessionController' ? controller : undefined)),
    provide: vi.fn(),
    effect: vi.fn((factory: () => unknown) => {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose as () => void)
    }),
    on: vi.fn((name: string, listener: Listener) => {
      const list = listeners.get(name) ?? []
      list.push(listener)
      listeners.set(name, list)
      return () => {
        listeners.set(name, (listeners.get(name) ?? []).filter(candidate => candidate !== listener))
      }
    }),
  }
  return {
    context: context as unknown as Context,
    listeners,
    dispose: () => { for (const dispose of disposers.splice(0)) dispose() },
  }
}

const controller = {
  list: async () => ({ items: [] }),
  prompt: async () => ({ accepted: true }),
  updateQueue: () => ({ accepted: true }),
  cancel: () => ({ accepted: true }),
  page: async () => ({ records: [] }),
  control: () => ({ [Symbol.asyncIterator]: async function* () { /* stays open */ } }),
}

/** The scoped request shape both waterfalls carry. */
function request(sessionId: string) {
  return { agent: { id: sessionId } }
}

describe('voice interaction routing after a hang-up', () => {
  it('routes a question to voice while its handoff is still outstanding', async () => {
    // The user hung up, but the Agent is still blocked on this session.
    const { context } = createContext(controller)
    installApiProxyCompat(context, {
      isVoiceSession: () => false,
      watchesHandoff: sessionId => sessionId === 'session-1',
    })
    const listener = (context as unknown as { on: { mock: { calls: [string, Listener][] } } })
      .on.mock.calls.find(([name]) => name === 'user-questions/request')?.[1]
    expect(listener).toBeDefined()

    const next = vi.fn()
    void listener!(request('session-1') as never, next as never)
    // Voice owns the answer, so the browser answerer must not also claim it.
    expect(next).not.toHaveBeenCalled()
  })

  it('leaves an unrelated session to the browser answerer', () => {
    const { context } = createContext(controller)
    installApiProxyCompat(context, {
      isVoiceSession: () => false,
      watchesHandoff: () => false,
    })
    const listener = (context as unknown as { on: { mock: { calls: [string, Listener][] } } })
      .on.mock.calls.find(([name]) => name === 'approval/request')?.[1]

    const next = vi.fn()
    listener!(request('session-other') as never, next as never)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('hands a dismissed interaction back to the browser answerer', async () => {
    const { context } = createContext(controller)
    const control = installApiProxyCompat(context, {
      isVoiceSession: () => false,
      watchesHandoff: () => true,
    })
    const listener = (context as unknown as { on: { mock: { calls: [string, Listener][] } } })
      .on.mock.calls.find(([name]) => name === 'approval/request')?.[1]

    const next = vi.fn(async () => 'delegated-to-browser')
    // Read the interaction id the same way the voice host does: off the mux.
    const apiProxy = (context as unknown as { provide: { mock: { calls: [string, unknown][] } } })
      .provide.mock.calls.find(([name]) => name === 'apiProxy')?.[1] as {
        events: { mux(request: unknown, signal: AbortSignal): AsyncIterable<{ payload: { type: string; approvalId?: string } }> }
      }
    const abort = new AbortController()
    const frames = apiProxy.events.mux({}, abort.signal)[Symbol.asyncIterator]()
    const pending = listener!(request('session-1') as never, next as never)

    const first = await frames.next()
    const interactionId = (first.value as { payload: { approvalId: string } }).payload.approvalId
    // Dismissing must release the hold instead of leaving the Agent blocked on
    // a card nobody owns, so the browser answerer gets its turn.
    expect(control.delegateInteraction(interactionId)).toBe(true)
    await expect(pending).resolves.toBe('delegated-to-browser')
    expect(next).toHaveBeenCalledTimes(1)
    abort.abort()
  })
})
