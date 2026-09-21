import { describe, expect, it, vi } from 'vitest'
import {
  MAX_INBOX_ENTRIES,
  MAX_INBOX_SUMMARY_LENGTH,
  VoiceInbox,
} from '../src/host/voice-inbox.ts'

function assistantMessage(sessionId: string, turn: number, text: string) {
  return {
    rpcId: 'rpc',
    payload: {
      type: 'session/event',
      sessionId,
      event: { type: 'assistant/message', seq: 1, data: { turn, message: { content: [{ type: 'text', text }] } } },
    },
  } as never
}

function turnEnd(sessionId: string, turn: number, kind = 'completed') {
  return {
    rpcId: 'rpc',
    payload: {
      type: 'session/event',
      sessionId,
      event: { type: 'turn/end', seq: 2, data: { turn, reason: { kind } } },
    },
  } as never
}

function approvalRequested(sessionId: string, approvalId: string, toolName = 'exec_command') {
  return {
    rpcId: 'rpc',
    payload: {
      type: 'approval/requested',
      rpcId: 'rpc-approval',
      sessionId,
      approvalId,
      toolName,
      reason: '需要访问打印机',
    },
  } as never
}

function questionRequested(sessionId: string, rpcId: string) {
  return {
    rpcId: 'rpc',
    payload: {
      type: 'question/requested',
      rpcId,
      sessionId,
      questions: [{
        id: 'q1',
        question: '要保留旧文件吗？',
        options: [{ label: '保留' }, { label: '删除' }],
      }],
    },
  } as never
}

function resolved(frame: 'approval' | 'question', id: string) {
  return frame === 'approval'
    ? { rpcId: 'rpc', payload: { type: 'approval/resolved', sessionId: 'session-1', approvalId: id, outcome: 'allowed-once' } } as never
    : { rpcId: 'rpc', payload: { type: 'question/resolved', sessionId: 'session-1', questionRpcId: id, outcome: 'answered' } } as never
}

describe('voice call-back inbox', () => {
  it('queues nothing for sessions the voice surface never delegated to', () => {
    const inbox = new VoiceInbox()
    expect(inbox.observe(assistantMessage('session-other', 1, '别人的结果'))).toBeUndefined()
    expect(inbox.observe(turnEnd('session-other', 1))).toBeUndefined()
    expect(inbox.list()).toEqual([])
  })

  it('queues one entry with the final assistant text when a watched turn ends', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'handoff-1', sessionId: 'session-1', request: '列出项目', sessionTitle: '项目盘点' })
    inbox.observe(assistantMessage('session-1', 3, '中间进展'))
    inbox.observe(assistantMessage('session-1', 3, '最终结论：有 5 个项目。'))
    const entry = inbox.observe(turnEnd('session-1', 3))
    expect(entry).toMatchObject({
      handoffId: 'handoff-1',
      sessionId: 'session-1',
      sessionTitle: '项目盘点',
      request: '列出项目',
      summary: '最终结论：有 5 个项目。',
      status: 'completed',
      delivered: false,
    })
    expect(entry!.durationMs).toBeGreaterThanOrEqual(0)
    expect(inbox.list()).toHaveLength(1)
  })

  it('tracks failed and cancelled turns separately from completed ones', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-ok', sessionId: 's-ok', request: 'A' })
    inbox.watch({ handoffId: 'h-fail', sessionId: 's-fail', request: 'B' })
    inbox.watch({ handoffId: 'h-cancel', sessionId: 's-cancel', request: 'C' })
    expect(inbox.observe(turnEnd('s-ok', 1))?.status).toBe('completed')
    expect(inbox.observe(turnEnd('s-fail', 1, 'error'))?.status).toBe('failed')
    expect(inbox.observe(turnEnd('s-cancel', 1, 'cancelled'))?.status).toBe('cancelled')
  })

  it('reports a fallback summary when the turn never produced assistant text', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    expect(inbox.observe(turnEnd('s-1', 1, 'failed'))?.summary).toContain('失败')
  })

  it('completes a watch only once, so one turn cannot ring twice', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    expect(inbox.observe(turnEnd('s-1', 1))).toBeDefined()
    expect(inbox.observe(turnEnd('s-1', 1))).toBeUndefined()
    expect(inbox.list()).toHaveLength(1)
  })

  it('retires a listened report instead of leaving an inert row', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    const entry = inbox.observe(turnEnd('s-1', 1))!
    expect(inbox.undelivered()).toHaveLength(1)
    expect(inbox.markDelivered([entry.id])).toHaveLength(1)
    // The whole point of the entry was one spoken result, so once it is heard
    // it is done: a delivered row must not linger in the list.
    expect(inbox.list()).toEqual([])
    expect(inbox.undelivered()).toHaveLength(0)
    expect(inbox.markDelivered([entry.id])).toHaveLength(0)
  })

  it('can mark one handoff delivered so a call that already spoke it never rings back', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    inbox.watch({ handoffId: 'h-2', sessionId: 's-2', request: 'B' })
    inbox.observe(turnEnd('s-1', 1))
    inbox.observe(turnEnd('s-2', 1))
    expect(inbox.markHandoffDelivered('h-1')).toMatchObject({ handoffId: 'h-1', delivered: true })
    expect(inbox.markHandoffDelivered('h-1')).toBeUndefined()
    expect(inbox.undelivered().map(entry => entry.handoffId)).toEqual(['h-2'])
  })

  it('does not ring back when the spoken marker arrives before the turn end', () => {
    // The live call and the inbox consume two independent streams of the same
    // frame, so either order is possible; both must suppress the ring.
    const spokenFirst = new VoiceInbox()
    spokenFirst.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    spokenFirst.markHandoffDelivered('h-1')
    expect(spokenFirst.observe(turnEnd('s-1', 1))).toMatchObject({ handoffId: 'h-1', delivered: true })
    expect(spokenFirst.undelivered()).toEqual([])
  })

  it('caps its summary and its queue so a long-running host stays bounded', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-long', sessionId: 's-long', request: 'A' })
    inbox.observe(assistantMessage('s-long', 1, 'x'.repeat(50_000)))
    expect(inbox.observe(turnEnd('s-long', 1))!.summary.length).toBeLessThanOrEqual(MAX_INBOX_SUMMARY_LENGTH)

    for (let index = 0; index < MAX_INBOX_ENTRIES + 5; index += 1) {
      const sessionId = `s-${index}`
      inbox.watch({ handoffId: `h-${index}`, sessionId, request: 'A' })
      inbox.observe(turnEnd(sessionId, 1))
    }
    expect(inbox.list().length).toBe(MAX_INBOX_ENTRIES)
  })

  it('resolves a missing session title without blocking the ring', async () => {
    const inbox = new VoiceInbox()
    let resolveTitle!: (title: string) => void
    inbox.setTitleLookup(() => new Promise(resolve => { resolveTitle = resolve }))
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    const entry = inbox.observe(turnEnd('s-1', 1))!
    expect(entry.sessionTitle).toBeUndefined()
    resolveTitle('迟到的标题')
    await Promise.resolve()
    expect(inbox.list()[0]?.sessionTitle).toBe('迟到的标题')
  })

  it('never lets a failed title lookup reject', async () => {
    const inbox = new VoiceInbox()
    inbox.setTitleLookup(async () => { throw new Error('session list unavailable') })
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    expect(() => inbox.observe(turnEnd('s-1', 1))).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
  })

  it('ignores malformed frames instead of throwing', () => {
    const inbox = new VoiceInbox()
    const warn = vi.fn()
    void warn
    expect(() => inbox.observe({ rpcId: 'r', payload: { type: 'session/event' } } as never)).not.toThrow()
    expect(() => inbox.observe({
      rpcId: 'r',
      payload: { type: 'session/event', sessionId: 's', event: { type: 'turn/end' } },
    } as never)).not.toThrow()
    expect(() => inbox.observe({
      rpcId: 'r',
      payload: { type: 'host/session-status', sessionId: 's', running: true },
    } as never)).not.toThrow()
  })
})

describe('pending interactions reach the ring-back list', () => {
  it('lists an approval the Agent raised while no call was active', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: '打印机任务', sessionTitle: '打印' })

    const entry = inbox.observe(approvalRequested('session-1', 'approval-1'))
    expect(entry).toMatchObject({
      status: 'needs-input',
      kind: 'needs-input',
      interactionId: 'approval-1',
      sessionTitle: '打印',
    })
    // The prompt must be speakable as-is: this is what the voice surface reads.
    expect(entry!.summary).toContain('exec_command')
    expect(inbox.pendingInteraction('approval-1')).toMatchObject({ kind: 'approval' })
  })

  it('lists a question and keeps every option for the spoken answer', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: '清理目录' })

    const entry = inbox.observe(questionRequested('session-1', 'question-1'))
    expect(entry).toMatchObject({ status: 'needs-input', interactionId: 'question-1' })
    expect(entry!.summary).toContain('要保留旧文件吗？')
    expect(entry!.summary).toContain('保留')
    expect(inbox.pendingInteraction('question-1')).toMatchObject({ kind: 'question' })
  })

  it('drops the entry once the interaction is answered', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: 'A' })
    inbox.observe(questionRequested('session-1', 'question-1'))
    expect(inbox.list()).toHaveLength(1)

    inbox.observe(resolved('question', 'question-1'))
    expect(inbox.list()).toEqual([])
    expect(inbox.pendingInteraction('question-1')).toBeUndefined()
  })

  it('does not list an interaction a live call is already speaking', () => {
    const inbox = new VoiceInbox()
    inbox.setIsLiveCall(sessionId => sessionId === 'session-1')
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: 'A' })

    expect(inbox.observe(approvalRequested('session-1', 'approval-1'))).toBeUndefined()
    expect(inbox.list()).toEqual([])
  })

  it('hands a dismissed pending interaction back to the browser surface', () => {
    const inbox = new VoiceInbox()
    const delegated: string[] = []
    inbox.setDelegateInteraction(id => delegated.push(id))
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: 'A' })
    const entry = inbox.observe(questionRequested('session-1', 'question-1'))!

    inbox.dismiss([entry.id])
    // Otherwise the Agent would wait forever on a card nobody owns.
    expect(delegated).toEqual(['question-1'])
    expect(inbox.list()).toEqual([])
  })

  it('lists a question again once the call that was asking it has ended', () => {
    const inbox = new VoiceInbox()
    let live = true
    inbox.setIsLiveCall(() => live)
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: '清理目录' })

    // On the call the question is spoken out loud, so the list stays quiet.
    const asked = inbox.observe(questionRequested('session-1', 'question-1'))
    expect(asked).toBeUndefined()
    expect(inbox.list()).toEqual([])

    // The user hangs up without answering. The Agent is still blocked, and the
    // voice surface is the only place that can reach them, so the question has
    // to become exactly what it would have been had they never called.
    live = false
    expect(inbox.list()).toMatchObject([{
      status: 'needs-input',
      kind: 'needs-input',
      interactionId: 'question-1',
    }])
    // The spoken answer must still be routable back to the blocked Agent.
    expect(inbox.pendingInteraction('question-1')).toMatchObject({ kind: 'question' })
  })

  it('does not resurrect a question the user answered before hanging up', () => {
    const inbox = new VoiceInbox()
    let live = true
    inbox.setIsLiveCall(() => live)
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: '清理目录' })
    inbox.observe(questionRequested('session-1', 'question-1'))

    // Answered out loud while still on the call, then the user hangs up.
    inbox.observe(resolved('question', 'question-1'))
    live = false
    expect(inbox.list()).toEqual([])
    expect(inbox.pendingInteraction('question-1')).toBeUndefined()
  })

  it('does not list a deferred question twice across polls', () => {
    const inbox = new VoiceInbox()
    let live = true
    inbox.setIsLiveCall(() => live)
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: '清理目录' })
    inbox.observe(questionRequested('session-1', 'question-1'))
    live = false

    // `list()` drives the two-second presence poll, so it must be idempotent.
    expect(inbox.list()).toHaveLength(1)
    expect(inbox.list()).toHaveLength(1)
  })

  it('never lists the same interaction twice', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 'session-1', request: 'A' })
    expect(inbox.observe(approvalRequested('session-1', 'approval-1'))).toBeDefined()
    expect(inbox.observe(approvalRequested('session-1', 'approval-1'))).toBeUndefined()
    expect(inbox.list()).toHaveLength(1)
  })
})
