// @vitest-environment jsdom
import { act } from 'react-dom/test-utils'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceOverlay } from '../src/client/VoiceOverlay.tsx'
import type { VoiceSnapshot } from '../src/client/controller.ts'
import type { VoiceInboxEntry } from '../src/protocol.ts'

const ringtone = vi.hoisted(() => ({ playRingtone: vi.fn() }))
vi.mock('../src/client/ringtone.ts', () => ({ playRingtone: ringtone.playRingtone }))

function inboxEntry(id = 'inbox-1'): VoiceInboxEntry {
  return {
    id,
    handoffId: `handoff-${id}`,
    sessionId: 'session-one',
    sessionTitle: '项目盘点',
    request: '列出项目列表',
    summary: '共 5 个项目。',
    status: 'completed',
    createdAt: Date.now() - 5_000,
    durationMs: 4_000,
    delivered: false,
  }
}

function idleSnapshot(inbox: readonly VoiceInboxEntry[]): VoiceSnapshot {
  return {
    phase: 'idle',
    muted: false,
    userTranscript: '',
    assistantTranscript: '',
    agentRunning: false,
    elapsedSeconds: 0,
    inbox,
    inboxSelection: [],
    snoozedInbox: [],
  }
}

function callSnapshot(): VoiceSnapshot {
  return {
    phase: 'listening',
    sessionId: 'session-one',
    voiceSessionId: 'voice-one',
    muted: false,
    userTranscript: '',
    assistantTranscript: '',
    agentRunning: false,
    providerModel: 'qwen-audio-3.0-realtime-plus',
    turnDetection: 'server_vad',
    elapsedSeconds: 3,
    inbox: [],
    inboxSelection: [],
    snoozedInbox: [],
  }
}

/** Mount the overlay with a snapshot the test can swap between renders. */
function mountOverlay(initial: VoiceSnapshot, ringDurationMs = 10_000) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  let snapshot = initial
  const handlers = {
    end: vi.fn(),
    toggleMute: vi.fn(),
    cancelResponse: vi.fn(),
    answerApproval: vi.fn(),
    answerQuestion: vi.fn(),
    answerInbox: vi.fn(),
    answerInboxOne: vi.fn(),
    snoozeInbox: vi.fn(),
    toggleInboxSelection: vi.fn(),
    selectAllInbox: vi.fn(),
    clearInboxSelection: vi.fn(),
    dismissInbox: vi.fn(),
    openSession: vi.fn(),
  }
  const paint = (next: VoiceSnapshot) => {
    snapshot = next
    act(() => {
      root.render(
        <VoiceOverlay {...({
          useVoice: (selector: (value: VoiceSnapshot) => unknown) => selector(snapshot),
          useVoiceModelSettings: (selector: (value: unknown) => unknown) => selector({ ringDurationMs }),
          useSessions: (selector: (value: unknown) => unknown) => selector({ current: 'session-one', byId: {} }),
          ...handlers,
        } as never)} />,
      )
    })
  }
  paint(initial)
  return {
    container,
    handlers,
    render: paint,
    findByText: (text: string) => [...container.querySelectorAll('button')].find(button => button.textContent === text),
    unmount: () => act(() => root.unmount()),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  ringtone.playRingtone.mockReset()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  // jsdom has no pointer capture; a drag that escapes its guard would throw here.
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('call-back list interactions', () => {
  it('honors the interactive guard after the call was collapsed to the orb', () => {
    const view = mountOverlay(callSnapshot())

    // The reported path: the user shrinks the running call to the floating orb,
    // then hangs up. The orb stays collapsed while the call returns to idle.
    const collapse = view.container.querySelector('[aria-label="收起为悬浮球"]')
    expect(collapse).not.toBeNull()
    act(() => {
      collapse!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    view.render(idleSnapshot([inboxEntry()]))

    // `beginDrag` calls `preventDefault()` and captures the pointer, which is
    // what swallowed the click in the browser. Exempting the control is the
    // observable fix: the drag must never claim a button in the list.
    const capture = Element.prototype.setPointerCapture as unknown as { mock: { calls: unknown[] } }
    capture.mock.calls.length = 0
    const take = view.findByText('接听')
    expect(take).toBeDefined()
    act(() => {
      take!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }))
    })
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled()

    act(() => {
      take!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.handlers.answerInboxOne).toHaveBeenCalledWith('inbox-1')

    const read = view.findByText('已读')
    act(() => {
      read!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.handlers.dismissInbox).toHaveBeenCalledWith(['inbox-1'])

    const later = view.findByText('稍后')
    act(() => {
      later!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.handlers.snoozeInbox).toHaveBeenCalledWith('inbox-1')
    view.unmount()
  })

  it('still lets the collapsed orb be dragged from its own button', () => {
    const view = mountOverlay(callSnapshot())
    const collapse = view.container.querySelector('[aria-label="收起为悬浮球"]')
    act(() => {
      collapse!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const orb = view.container.querySelector('[aria-label="展开实时语音"]')
    expect(orb).not.toBeNull()
    act(() => {
      orb!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2 }))
    })
    // The orb has no other grab surface, so its button stays draggable.
    expect(Element.prototype.setPointerCapture).toHaveBeenCalled()
    view.unmount()
  })
})

describe('call-back ringtone lifecycle', () => {
  it('survives the empty-list render that follows every inbox poll', () => {
    const stop = vi.fn()
    ringtone.playRingtone.mockReturnValue(stop)
    const entry = inboxEntry()
    const view = mountOverlay(idleSnapshot([entry]))
    expect(ringtone.playRingtone).toHaveBeenCalledWith(10_000)

    // The presence poll feeds a brand new snapshot two seconds later. Its ids
    // are unchanged, so this must not tear down the ringing bell.
    act(() => { vi.advanceTimersByTime(2_000) })
    view.render(idleSnapshot([{ ...entry }]))
    act(() => { vi.advanceTimersByTime(3_000) })
    expect(stop).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(5_000) })
    expect(stop).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('stops ringing once the call is answered', () => {
    const stop = vi.fn()
    ringtone.playRingtone.mockReturnValue(stop)
    const view = mountOverlay(idleSnapshot([inboxEntry()]))

    act(() => { vi.advanceTimersByTime(1_000) })
    view.render(callSnapshot())
    expect(stop).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})
