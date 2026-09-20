import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { VoiceConnection } from '../src/host/voice-connection.ts'
import { isReadOnlyReportIntent } from '../src/host/voice-intent.ts'

class FakeBrowserSocket extends EventEmitter {
  readonly OPEN = 1
  readonly CONNECTING = 0
  readyState = this.OPEN
  bufferedAmount = 0
  send(_value: unknown, _options?: unknown, callback?: (error?: Error) => void): void { callback?.() }
  close(): void { this.readyState = 3 }
}

describe('repeated provider Function Calls', () => {
  it('does not ask Qwen for another response when DSH converges a new callId onto the same handoff', async () => {
    const connection = new VoiceConnection(
      { logger: { warn: vi.fn() } } as never,
      new FakeBrowserSocket() as never,
      {} as never,
      new Config({}),
      vi.fn(),
    )
    const completeFunctionCall = vi.fn()
    const internal = connection as unknown as {
      provider: { completeFunctionCall(callId: string, output: unknown, options?: { requestResponse?: boolean }): void; close(): void }
      functionBridge: { execute(): Promise<{ output: unknown; ok: boolean; cached: boolean }> }
      handleFunctionCall(event: Record<string, unknown>): Promise<void>
    }
    internal.provider = { completeFunctionCall, close: vi.fn() }
    internal.functionBridge = {
      execute: vi.fn(async () => ({
        ok: true,
        cached: false,
        output: { status: 'accepted', handoff_id: 'handoff-1', duplicate: true },
      })),
    }

    await internal.handleFunctionCall({
      type: 'response.function_call_arguments.done',
      call_id: 'new-provider-call-id',
      name: 'handoff_to_dsh_agent',
      arguments: JSON.stringify({ instruction: '查一下再告诉我' }),
    })

    expect(completeFunctionCall).toHaveBeenCalledWith(
      'new-provider-call-id',
      expect.objectContaining({ duplicate: true, handoff_id: 'handoff-1' }),
      { requestResponse: false },
    )
    connection.dispose()
  })

  it.each([
    '汇报啊',
    '请汇报一下',
    '帮我汇报工作',
    '你查一下再告诉我吧。',
    '现在什么进展？',
    '把结果告诉我',
  ])('treats “%s” as a read-only report request', (spoken) => {
    expect(isReadOnlyReportIntent(spoken)).toBe(true)
  })

  it('keeps an explicit request to write a report as executable work', () => {
    expect(isReadOnlyReportIntent('再写一份100字工作汇报')).toBe(false)
  })

  it('blocks an execution handoff when the current user turn only asks for a report', async () => {
    const connection = new VoiceConnection(
      { logger: { warn: vi.fn() } } as never,
      new FakeBrowserSocket() as never,
      {} as never,
      new Config({}),
      vi.fn(),
    )
    const execute = vi.fn()
    const completeFunctionCall = vi.fn()
    const updateTools = vi.fn()
    const internal = connection as unknown as {
      latestUserTranscript: string
      provider: { completeFunctionCall: typeof completeFunctionCall; updateTools: typeof updateTools; close(): void }
      functionBridge: { execute: typeof execute }
      handleFunctionCall(event: Record<string, unknown>): Promise<void>
    }
    internal.latestUserTranscript = '把结果告诉我'
    internal.provider = { completeFunctionCall, updateTools, close: vi.fn() }
    internal.functionBridge = { execute }

    await internal.handleFunctionCall({
      type: 'response.function_call_arguments.done',
      call_id: 'wrong-execution-call',
      name: 'handoff_to_dsh_agent',
      arguments: JSON.stringify({ instruction: '生成并保存工作汇报' }),
    })

    expect(execute).not.toHaveBeenCalled()
    expect(updateTools).toHaveBeenCalledTimes(1)
    expect(completeFunctionCall).toHaveBeenCalledWith(
      'wrong-execution-call',
      expect.objectContaining({ status: 'needs-clarification' }),
    )
    connection.dispose()
  })
})
