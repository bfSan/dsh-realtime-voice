import { Context } from '@deepseek-ai/cordis'
import { scopeTarget } from '@deepseek-ai/dsh-scope'
import { describe, expect, it, vi } from 'vitest'
import { installApiProxyCompat } from '../src/host/dsh-runtime-compat.ts'

/**
 * Real-Cordis contract for the interaction waterfalls.
 *
 * The deployed desktop profile loads `@deepseek-ai/dsh-base` and
 * `@deepseek-ai/dsh-web-app` before any third-party bundle, and
 * `@deepseek-ai/dsh-api-remotes` registers the browser answerer for
 * `approval/request` and `user-questions/request` from inside that bundle.
 * Cordis `waterfall` runs listeners outermost-first in registration order, and
 * a listener that does not call `next()` vetoes the rest of the chain.
 *
 * A shim registered after the browser answerer therefore never sees a request
 * the browser already claimed. That was the bug where an Agent that blocked on
 * a question while the user walked away never rang back: the request was held
 * by a browser surface nobody was watching. These tests pin the required
 * ordering with a real Cordis context instead of a fake emitter, because a
 * fake emitter cannot reproduce the ordering at all.
 */

const controller = {
  list: async () => ({ items: [] }),
  prompt: async () => ({ accepted: true }),
  updateQueue: () => ({ accepted: true }),
  cancel: () => ({ accepted: true }),
  page: async () => ({ records: [] }),
  control: () => ({ [Symbol.asyncIterator]: async function* () { /* stays open */ } }),
}

/** Settle one plugin-loading turn so injected services are registered. */
function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Resolve with whichever surface claimed the request first.
 *
 * The mux frame proves voice took it; the timer proves the request stalled in
 * the browser answerer without ever reaching voice.
 */
async function claimedBy(apiProxy: unknown, signal: AbortSignal): Promise<'voice' | 'browser'> {
  const mux = (apiProxy as {
    events: { mux(request: unknown, signal: AbortSignal): AsyncIterable<{ payload: { type: string } }> }
  }).events.mux({}, signal)
  const frame = mux[Symbol.asyncIterator]().next().then(first => first.value.payload.type)
  const stalled = new Promise<'browser'>(resolve => setTimeout(() => resolve('browser'), 150))
  return Promise.race([frame.then(() => 'voice' as const), stalled])
}

/** The browser answerer from `dsh-client-ui-approval`, held open on a click. */
function browserAnswerer() {
  const reached = vi.fn()
  const listener = (async (_request: unknown) => {
    reached()
    return new Promise(() => { /* held until the browser user answers */ })
  }) as never
  return { reached, listener }
}

describe('interaction waterfall ordering in a real Cordis context', () => {
  it('claims a question for voice although the browser answerer registered first', async () => {
    const root = new Context()
    root.provide('sessionController', controller)
    const browser = browserAnswerer()
    root.on('user-questions/request', browser.listener)

    const shim = root.extend({})
    installApiProxyCompat(shim, { isVoiceSession: () => true, watchesHandoff: () => true })
    await nextTick()

    const abort = new AbortController()
    const claim = claimedBy(shim.get('apiProxy'), abort.signal)
    const agent = { id: 'session-1' }
    void root.waterfall(
      scopeTarget(agent, agent),
      'user-questions/request',
      { agent, questions: [{ id: 'q1', question: '继续吗？' }] },
      async () => 'unavailable',
    )

    // The user who walked away is only reachable by voice, so voice must get
    // first refusal before the browser answerer parks the request.
    expect(await claim).toBe('voice')
    expect(browser.reached).not.toHaveBeenCalled()
    abort.abort()
  })

  it('claims an approval for voice although the browser answerer registered first', async () => {
    const root = new Context()
    root.provide('sessionController', controller)
    const browser = browserAnswerer()
    root.on('approval/request', browser.listener)

    const shim = root.extend({})
    installApiProxyCompat(shim, { isVoiceSession: () => true, watchesHandoff: () => true })
    await nextTick()

    const abort = new AbortController()
    const claim = claimedBy(shim.get('apiProxy'), abort.signal)
    const agent = { id: 'session-1' }
    void root.waterfall(
      scopeTarget(agent, agent),
      'approval/request',
      { agent, toolName: 'bash' },
      async () => 'unavailable',
    )

    expect(await claim).toBe('voice')
    expect(browser.reached).not.toHaveBeenCalled()
    abort.abort()
  })
  it('leaves a session voice does not own to the browser answerer', async () => {
    const root = new Context()
    root.provide('sessionController', controller)
    const browser = browserAnswerer()
    root.on('approval/request', browser.listener)

    const shim = root.extend({})
    // Prepending must not steal interactions voice has no claim on: an
    // unrelated session keeps the normal DSH approval UI.
    installApiProxyCompat(shim, { isVoiceSession: () => false, watchesHandoff: () => false })
    await nextTick()

    const agent = { id: 'session-other' }
    void root.waterfall(
      scopeTarget(agent, agent),
      'approval/request',
      { agent, toolName: 'bash' },
      async () => 'unavailable',
    )
    await nextTick()

    expect(browser.reached).toHaveBeenCalledTimes(1)
  })
})
