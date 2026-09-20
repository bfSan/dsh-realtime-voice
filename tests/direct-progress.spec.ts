import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { DshBackendBridge, type DshBackendEvent } from '../src/host/dsh-backend-bridge.ts'
import { DshVoiceCoordinator } from '../src/host/dsh-coordinator.ts'
import { REALTIME_VOICE_PROGRESS_REPORTING } from '../src/models.ts'

const sessionId = 'session-direct-progress'

function ok(value: unknown = {}) {
  return { result: { ok: true as const, value } }
}

function createContext() {
  return {
    apiProxy: {
      sessions: {
        prompt: vi.fn(async () => ok()),
        list: vi.fn(async () => ok({
          items: [{ sessionId, running: false, blank: false, projections: { values: {} } }],
        })),
        cancel: vi.fn(async () => ok()),
        updateQueue: vi.fn(async () => ok()),
      },
      respond: vi.fn(async () => ({ accepted: true as const })),
    },
    logger: { warn: vi.fn() },
  } as never
}

function createBridge(config = new Config({})) {
  const ctx = createContext()
  const coordinator = new DshVoiceCoordinator(ctx, sessionId)
  const backendEvents: DshBackendEvent[] = []
  const bridge = new DshBackendBridge(ctx, sessionId, coordinator, {
    onAgentStatus: vi.fn(),
    onApproval: vi.fn(),
    onQuestion: vi.fn(),
    onBackendEvent: event => backendEvents.push(event),
  }, config)
  const internals = bridge as unknown as {
    projectSessionEvent(event: Record<string, unknown>): void
  }
  return { internals, backendEvents, bridge }
}

function assistantMessage(seq: number, turn: number, text: string): Record<string, unknown> {
  return {
    type: 'assistant/message',
    seq,
    data: { turn, message: { content: [{ type: 'text', text }] } },
  }
}

describe('direct client progress announcements', () => {
  it('does not forward every stage update to a direct media client', () => {
    const { internals, backendEvents, bridge } = createBridge()
    internals.projectSessionEvent(assistantMessage(1, 0, '第一步：读取文件'))
    internals.projectSessionEvent(assistantMessage(2, 0, '第二步：修改文件'))
    internals.projectSessionEvent(assistantMessage(3, 0, '第三步：运行测试'))

    expect(backendEvents.filter(event => event.kind === 'status')).toHaveLength(0)
    bridge.stop()
  })

  it('never drops a terminal result or a user-actionable event', () => {
    const { internals, backendEvents, bridge } = createBridge()
    internals.projectSessionEvent(assistantMessage(1, 0, '正在处理'))
    internals.projectSessionEvent({
      type: 'turn/end',
      seq: 2,
      data: { turn: 0, reason: { kind: 'completed' } },
    })

    const terminal = backendEvents.filter(event => event.kind === 'complete')
    expect(terminal).toHaveLength(1)
    expect(terminal[0]!.text).toContain('正在处理')
    bridge.stop()
  })

  it('still forwards every stage update when reporting is explicitly full', () => {
    const { internals, backendEvents, bridge } = createBridge(new Config({
      progressReporting: REALTIME_VOICE_PROGRESS_REPORTING.all,
    }))
    internals.projectSessionEvent(assistantMessage(1, 0, '一'))
    internals.projectSessionEvent(assistantMessage(2, 0, '二'))

    expect(backendEvents.filter(event => event.kind === 'status')).toHaveLength(2)
    bridge.stop()
  })
})
