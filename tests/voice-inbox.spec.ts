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

  it('tracks delivered state and removes entries on request', () => {
    const inbox = new VoiceInbox()
    inbox.watch({ handoffId: 'h-1', sessionId: 's-1', request: 'A' })
    const entry = inbox.observe(turnEnd('s-1', 1))!
    expect(inbox.undelivered()).toHaveLength(1)
    expect(inbox.markDelivered([entry.id])).toHaveLength(1)
    expect(inbox.undelivered()).toHaveLength(0)
    expect(inbox.markDelivered([entry.id])).toHaveLength(0)
    expect(inbox.dismiss([entry.id])).toBe(1)
    expect(inbox.list()).toEqual([])
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
