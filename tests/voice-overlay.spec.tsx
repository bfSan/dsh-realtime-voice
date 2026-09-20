import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { VoiceOverlay } from '../src/client/VoiceOverlay.tsx'
import type { VoiceSnapshot } from '../src/client/controller.ts'

describe('floating voice overlay', () => {
  it('renders the bound session, fast VAD mode, and independent call controls', () => {
    const voice: VoiceSnapshot = {
      phase: 'speaking',
      sessionId: 'session-one',
      voiceSessionId: 'voice-one',
      muted: false,
      userTranscript: '请继续',
      assistantTranscript: '正在处理。',
      agentRunning: false,
      providerModel: 'qwen-audio-3.0-realtime-plus',
      turnDetection: 'server_vad',
      elapsedSeconds: 65,
      pendingApproval: { approvalId: 'approval-one', toolName: 'exec_command', reason: '需要访问打印机' },
    }
    const html = renderToStaticMarkup(<VoiceOverlay {...({
      useVoice: (selector: (value: VoiceSnapshot) => unknown) => selector(voice),
      useVoiceModelSettings: (selector: (value: unknown) => unknown) => selector({ ringDurationMs: 5_000 }),
      useSessions: (selector: (value: unknown) => unknown) => selector({
        current: 'session-one',
        byId: { 'session-one': { displayTitle: '绑定任务', blank: false } },
      }),
      end: vi.fn(),
      toggleMute: vi.fn(),
      cancelResponse: vi.fn(),
      answerInbox: vi.fn(),
      answerInboxOne: vi.fn(),
      snoozeInbox: vi.fn(),
      toggleInboxSelection: vi.fn(),
      selectAllInbox: vi.fn(),
      clearInboxSelection: vi.fn(),
      dismissInbox: vi.fn(),
      openSession: vi.fn(),
    } as never)} />)

    expect(html).toContain('aria-label="实时语音通话"')
    expect(html).toContain('绑定任务')
    expect(html).toContain('快速声学打断')
    expect(html).toContain('立即打断')
    expect(html).toContain('需要你的批准')
    expect(html).toContain('仅允许这一次')
    expect(html).toContain('01:05')
  })

  it('renders the multi-select call-back list while no call is active', () => {
    const voice: VoiceSnapshot = {
      phase: 'idle',
      muted: false,
      userTranscript: '',
      assistantTranscript: '',
      agentRunning: false,
      elapsedSeconds: 0,
      inbox: [
        {
          id: 'inbox-1',
          handoffId: 'handoff-1',
          sessionId: 'session-one',
          sessionTitle: '项目盘点',
          request: '列出项目列表',
          summary: '共 5 个项目。',
          status: 'completed',
          createdAt: Date.now() - 120_000,
          durationMs: 95_000,
          delivered: false,
        },
        {
          id: 'inbox-2',
          handoffId: 'handoff-2',
          sessionId: 'session-two',
          request: '查找会话',
          summary: '找到 3 个。',
          status: 'failed',
          createdAt: Date.now() - 20_000,
          durationMs: 8_000,
          delivered: false,
        },
      ],
      inboxSelection: ['inbox-1'],
      snoozedInbox: [],
    }
    const html = renderToStaticMarkup(<VoiceOverlay {...({
      useVoice: (selector: (value: VoiceSnapshot) => unknown) => selector(voice),
      useVoiceModelSettings: (selector: (value: unknown) => unknown) => selector({ ringDurationMs: 5_000 }),
      useSessions: (selector: (value: unknown) => unknown) => selector({ current: undefined, byId: {} }),
      end: vi.fn(),
      toggleMute: vi.fn(),
      cancelResponse: vi.fn(),
      answerInbox: vi.fn(),
      answerInboxOne: vi.fn(),
      snoozeInbox: vi.fn(),
      toggleInboxSelection: vi.fn(),
      selectAllInbox: vi.fn(),
      clearInboxSelection: vi.fn(),
      dismissInbox: vi.fn(),
      openSession: vi.fn(),
    } as never)} />)

    expect(html).toContain('aria-label="待接听的语音汇报"')
    expect(html).toContain('2 个任务已完成，等待汇报')
    expect(html).toContain('项目盘点')
    expect(html).toContain('失败')
    expect(html).toContain('全部已读')
    // Every row carries its own three actions, so a task can be taken,
    // dismissed, or deferred without touching the multi-select state.
    expect(html.match(/>接听</g)).toHaveLength(3)
    // Two rows plus the footer's bulk action.
    expect(html.match(/>已读</g)).toHaveLength(2)
    expect(html.match(/>全部已读</g)).toHaveLength(1)
    expect(html.match(/>稍后</g)).toHaveLength(2)
    expect(html).toContain('role="checkbox"')
    expect(html).toContain('aria-checked="true"')
  })

  it('renders nothing when idle with an empty inbox', () => {
    const voice: VoiceSnapshot = {
      phase: 'idle',
      muted: false,
      userTranscript: '',
      assistantTranscript: '',
      agentRunning: false,
      elapsedSeconds: 0,
      inbox: [],
      inboxSelection: [],
      snoozedInbox: [],
    }
    const html = renderToStaticMarkup(<VoiceOverlay {...({
      useVoice: (selector: (value: VoiceSnapshot) => unknown) => selector(voice),
      useVoiceModelSettings: (selector: (value: unknown) => unknown) => selector({ ringDurationMs: 5_000 }),
      useSessions: (selector: (value: unknown) => unknown) => selector({ current: undefined, byId: {} }),
      end: vi.fn(),
      toggleMute: vi.fn(),
      cancelResponse: vi.fn(),
      answerInbox: vi.fn(),
      answerInboxOne: vi.fn(),
      snoozeInbox: vi.fn(),
      toggleInboxSelection: vi.fn(),
      selectAllInbox: vi.fn(),
      clearInboxSelection: vi.fn(),
      dismissInbox: vi.fn(),
      openSession: vi.fn(),
    } as never)} />)
    expect(html).toBe('')
  })
})
