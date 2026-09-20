import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressAnnouncementCoalescer } from '../src/host/progress-coalescer.ts'

interface Entry {
  id: string
  text: string
  body: string
  kind: 'status' | 'complete'
}

function createCoalescer(holdMs = 150) {
  const emitted: Entry[] = []
  const coalescer = new ProgressAnnouncementCoalescer<Entry>({
    holdMs,
    emit: entry => emitted.push(entry),
  })
  return { coalescer, emitted }
}

describe('progress announcement coalescer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('emits a lone stage update after the settle window', () => {
    const { coalescer, emitted } = createCoalescer()
    coalescer.offer({ id: 'p1', text: '[STATUS] 一', body: '一', kind: 'status' })
    expect(emitted).toHaveLength(0)

    vi.advanceTimersByTime(150)
    expect(emitted.map(entry => entry.id)).toEqual(['p1'])
  })

  it('drops a held stage update when the terminal report carries the same text', () => {
    const { coalescer, emitted } = createCoalescer()
    // Real evidence: session-806665a4 delivered the final answer as
    // `assistant/message` and then the identical text 2ms later as `turn/end`.
    coalescer.offer({ id: 'p1', text: '[STATUS] 已找到 53 个会话', body: '已找到 53 个会话', kind: 'status' })
    vi.advanceTimersByTime(2)
    coalescer.settle({ id: 't1', text: '[COMPLETE] 已找到 53 个会话', body: '已找到 53 个会话', kind: 'complete' })

    expect(emitted.map(entry => entry.id)).toEqual(['t1'])
    vi.advanceTimersByTime(1_000)
    expect(emitted.map(entry => entry.id)).toEqual(['t1'])
  })

  it('keeps both when the terminal report is genuinely different content', () => {
    const { coalescer, emitted } = createCoalescer()
    coalescer.offer({ id: 'p1', text: '[STATUS] 正在运行测试', body: '正在运行测试', kind: 'status' })
    vi.advanceTimersByTime(2)
    coalescer.settle({ id: 't1', text: '[COMPLETE] 测试全部通过', body: '测试全部通过', kind: 'complete' })

    // Ordering matters: the progress line must not be replayed after the result.
    expect(emitted.map(entry => entry.id)).toEqual(['p1', 't1'])
  })

  it('only supersedes the newest held update', () => {
    const { coalescer, emitted } = createCoalescer(1_000)
    coalescer.offer({ id: 'p1', text: '[STATUS] 旧进展', body: '旧进展', kind: 'status' })
    coalescer.offer({ id: 'p2', text: '[STATUS] 最终答案', body: '最终答案', kind: 'status' })
    coalescer.settle({ id: 't1', text: '[COMPLETE] 最终答案', body: '最终答案', kind: 'complete' })

    expect(emitted.map(entry => entry.id)).toEqual(['p1', 't1'])
  })

  it('normalizes whitespace before comparing bodies', () => {
    const { coalescer, emitted } = createCoalescer()
    coalescer.offer({ id: 'p1', text: '[STATUS] x', body: '结论：  没有记录\n', kind: 'status' })
    coalescer.settle({ id: 't1', text: '[COMPLETE] x', body: '结论：没有记录', kind: 'complete' })

    expect(emitted.map(entry => entry.id)).toEqual(['t1'])
  })

  it('flushes a pending update on dispose instead of leaking a timer', () => {
    const { coalescer, emitted } = createCoalescer(1_000)
    coalescer.offer({ id: 'p1', text: '[STATUS] 一', body: '一', kind: 'status' })
    coalescer.dispose()

    expect(emitted.map(entry => entry.id)).toEqual(['p1'])
    vi.advanceTimersByTime(5_000)
    expect(emitted.map(entry => entry.id)).toEqual(['p1'])
  })

  it('does not treat two different terminal reports as duplicates', () => {
    const { coalescer, emitted } = createCoalescer()
    coalescer.settle({ id: 't1', text: '[COMPLETE] 甲', body: '甲', kind: 'complete' })
    coalescer.settle({ id: 't2', text: '[COMPLETE] 乙', body: '乙', kind: 'complete' })

    expect(emitted.map(entry => entry.id)).toEqual(['t1', 't2'])
  })

  it('drops a terminal report whose text a stage update already spoke past the hold', () => {
    const { coalescer, emitted } = createCoalescer(150)
    // Real evidence (session-89bdc987): the final assistant text and the
    // terminal `turn/end` carry the same paragraph. When the provider queue
    // delays the stage update past the hold, the held pop can no longer catch
    // it and the paragraph is spoken twice.
    const body = '已完成全部检查。'
    coalescer.offer({ id: 'p1', text: '[STATUS] x', body, kind: 'status', group: 'turn-1' })
    vi.advanceTimersByTime(400)
    expect(emitted.map(entry => entry.id)).toEqual(['p1'])

    coalescer.settle({ id: 't1', text: '[COMPLETE] x', body, kind: 'complete', group: 'turn-1' })
    vi.advanceTimersByTime(1_000)
    expect(emitted.map(entry => entry.id)).toEqual(['p1'])
  })

  it('still announces identical text from a different turn', () => {
    const { coalescer, emitted } = createCoalescer(150)
    const body = '没有发现异常。'
    coalescer.settle({ id: 't1', text: '[COMPLETE] 甲', body, kind: 'complete', group: 'turn-1' })
    coalescer.settle({ id: 't2', text: '[COMPLETE] 乙', body, kind: 'complete', group: 'turn-2' })

    // Suppression is scoped to one unit of work, so a second task that really
    // produced the same sentence is still heard.
    expect(emitted.map(entry => entry.id)).toEqual(['t1', 't2'])
  })

  it('never suppresses an entry that declares no group', () => {
    const { coalescer, emitted } = createCoalescer(150)
    coalescer.settle({ id: 't1', text: '[COMPLETE] 甲', body: '相同内容', kind: 'complete' })
    coalescer.settle({ id: 't2', text: '[COMPLETE] 甲', body: '相同内容', kind: 'complete' })

    expect(emitted.map(entry => entry.id)).toEqual(['t1', 't2'])
  })
})
