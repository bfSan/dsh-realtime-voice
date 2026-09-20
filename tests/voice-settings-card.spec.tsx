import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { VoiceSettingsCard } from '../src/client/VoiceSettingsCard.tsx'
import { DEFAULT_REALTIME_VOICE_MODEL, DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING, DEFAULT_REALTIME_VOICE_TURN_DETECTION, DEFAULT_REALTIME_VOICE_VOICE } from '../src/models.ts'

describe('voice settings card', () => {
  it('renders the selected voice and an explicit preview control as one row', () => {
    const snapshot = {
      available: true, writable: true, saving: false, error: undefined,
      model: DEFAULT_REALTIME_VOICE_MODEL,
      turnDetection: DEFAULT_REALTIME_VOICE_TURN_DETECTION,
      voice: DEFAULT_REALTIME_VOICE_VOICE,
      vadThreshold: 0.35, silenceDurationMs: 500, maxHistoryTurns: 20,
      enableSpeechEmotion: true, stylePrompt: '',
      progressReporting: DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING,
      progressMinIntervalMs: 45_000, progressQuietTaskMs: 20_000,
      handoffSkill: '', handoffInstructions: '', supervisorSkill: '', supervisorInstructions: '',
      ringDurationMs: 5_000,
      apiKeyRef: 'DASHSCOPE_API_KEY', apiKeyConfigured: true, apiKeyWritable: true,
      apiKeySaving: false, apiKeyError: undefined,
    }
    const html = renderToStaticMarkup(<VoiceSettingsCard {...({
      useVoiceModelSettings: (selector: (value: typeof snapshot) => unknown) => selector(snapshot),
      selectModel: vi.fn(), selectTurnDetection: vi.fn(), selectVoice: vi.fn(),
      setVadThreshold: vi.fn(), setSilenceDuration: vi.fn(), setMaxHistoryTurns: vi.fn(),
      setSpeechEmotion: vi.fn(), setStylePrompt: vi.fn(), selectProgressReporting: vi.fn(),
      setProgressMinInterval: vi.fn(), setProgressQuietTask: vi.fn(), setHandoffSkill: vi.fn(),
      setHandoffInstructions: vi.fn(), setSupervisorSkill: vi.fn(), setSupervisorInstructions: vi.fn(),
      setRingDuration: vi.fn(), saveApiKey: vi.fn(),
    } as never)} />)
    expect(html).toContain('播报音色')
    expect(html).toContain('试听当前音色')
    expect(html).toContain('longanqian')
  })
})
