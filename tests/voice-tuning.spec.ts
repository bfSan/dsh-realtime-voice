import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { DashScopeRealtime } from '../src/host/dashscope-realtime.ts'
import { buildDirectMediaOfferBootstrap } from '../src/host/voice-bootstrap.ts'
import {
  REALTIME_VOICE_TURN_DETECTION,
  REALTIME_VOICE_TURN_DETECTION_MODES,
  REALTIME_VOICE_VOICES,
  DEFAULT_REALTIME_VOICE_VOICE,
  isRealtimeVoiceVoice,
  realtimeVoiceTurnDetectionLabel,
  realtimeVoiceVoiceLabel,
} from '../src/models.ts'
import WebSocket from 'ws'

class FakeSocket extends EventEmitter {
  readyState = WebSocket.OPEN
  bufferedAmount = 0
  readonly sent: Array<Record<string, unknown>> = []

  send(raw: string): void {
    const message = JSON.parse(raw) as Record<string, unknown>
    this.sent.push(message)
    if (message.type === 'session.update') this.event({ type: 'session.updated' })
  }

  close(): void {}

  event(value: Record<string, unknown>): void {
    queueMicrotask(() => this.emit('message', Buffer.from(JSON.stringify(value))))
  }
}

async function connectUpdate(config: Config): Promise<Record<string, unknown>> {
  const socket = new FakeSocket()
  const provider = new DashScopeRealtime(
    config,
    'secret-not-logged',
    'voice instructions',
    [],
    { onEvent: vi.fn() },
    ((_url, _options) => {
      socket.event({ type: 'session.created' })
      return socket as unknown as WebSocket
    }),
  )
  await provider.connect()
  provider.close()
  const update = socket.sent.find(message => message.type === 'session.update')
  return (update?.session ?? {}) as Record<string, unknown>
}

describe('realtime voice tuning surface', () => {
  it('exposes the voice list the service actually accepts', () => {
    expect(REALTIME_VOICE_VOICES).toHaveLength(19)
    expect(REALTIME_VOICE_VOICES[0]).toBe('longanqian')
    expect(new Set(REALTIME_VOICE_VOICES).size).toBe(REALTIME_VOICE_VOICES.length)
  })

  it('defaults every host tunable to its documented value', () => {
    const config = new Config({})
    expect(config.voice).toBe(DEFAULT_REALTIME_VOICE_VOICE)
    expect(config.vadThreshold).toBe(0.35)
    expect(config.silenceDurationMs).toBe(500)
    expect(config.maxHistoryTurns).toBe(20)
    expect(config.enableSpeechEmotion).toBe(true)
  })

  it('rejects a voice outside the service list', () => {
    expect(isRealtimeVoiceVoice('loongjohn')).toBe(true)
    expect(isRealtimeVoiceVoice('sam')).toBe(false)
    expect(() => new Config({ voice: 'sam' as never })).toThrow()
  })

  it('offers the three documented turn-detection modes with a readable label', () => {
    // The docs describe server_vad, smart_turn and push-to-talk; live probing
    // confirms smart_turn_v2 instead of a null-free third VAD variant.
    expect(REALTIME_VOICE_TURN_DETECTION.fast).toBe('server_vad')
    expect(REALTIME_VOICE_TURN_DETECTION.semantic).toBe('smart_turn')
    expect(REALTIME_VOICE_TURN_DETECTION.semanticV2).toBe('smart_turn_v2')
    expect(realtimeVoiceTurnDetectionLabel('smart_turn_v2')).toContain('智能语义轮次')
    expect(realtimeVoiceTurnDetectionLabel(REALTIME_VOICE_TURN_DETECTION.fast)).toBe('快速声学打断')
  })

  it('labels every voice instead of leaking a raw id', () => {
    expect(realtimeVoiceVoiceLabel('longanqian')).toContain('龙安')
    expect(realtimeVoiceVoiceLabel('__bogus__')).toBe('__bogus__')
  })

  it('keeps the three modes in one ordered list for the UI', () => {
    expect(REALTIME_VOICE_TURN_DETECTION_MODES).toEqual([
      'server_vad',
      'smart_turn',
      'smart_turn_v2',
    ])
  })

  it('keeps the direct/media bootstrap in sync with the host tunables', () => {
    const offer = buildDirectMediaOfferBootstrap(
      new Config({ voice: 'loongjohn', enableSpeechEmotion: false }),
      'instructions',
    )
    expect(offer.event.session).toMatchObject({
      voice: 'loongjohn',
      enable_speech_emotion: false,
      max_history_turns: 20,
    })
  })

  it('configures every documented session parameter it can actually use', async () => {
    const session = await connectUpdate(new Config({
      voice: 'loongjohn',
      turnDetection: REALTIME_VOICE_TURN_DETECTION.semanticV2,
      enableSpeechEmotion: false,
      maxHistoryTurns: 7,
    }))
    expect(session).toMatchObject({
      voice: 'loongjohn',
      enable_speech_emotion: false,
      max_history_turns: 7,
      turn_detection: { type: 'smart_turn_v2' },
    })
  })

  it('only sends the VAD knobs that the service honours', async () => {
    const session = await connectUpdate(new Config({
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      vadThreshold: 0.4,
      silenceDurationMs: 600,
    }))
    expect(session.turn_detection).toEqual({
      type: 'server_vad',
      threshold: 0.4,
      silence_duration_ms: 600,
    })
    // The service silently drops these; sending them would be a lie in the UI.
    expect(session).not.toHaveProperty('speed')
    expect(session).not.toHaveProperty('rate')
    expect(session).not.toHaveProperty('pitch')
    expect(session).not.toHaveProperty('enable_search')
  })
})
