import { AUDIO_CHANNELS, OUTPUT_SAMPLE_RATE, PCM_SAMPLE_BYTES } from '../protocol.ts'
import type { VoiceConfig } from './config.ts'
import { DashScopeRealtime, type RealtimeSocketFactory } from './dashscope-realtime.ts'

export const VOICE_PREVIEW_TEXT = '你好，我是 DSH 语音总管，这是当前音色的试听。'
const MAX_PREVIEW_PCM_BYTES = OUTPUT_SAMPLE_RATE * AUDIO_CHANNELS * PCM_SAMPLE_BYTES * 15

/**
 * Render one fixed, non-task sentence in a fresh provider session. This path
 * deliberately has no tools, DSH session, inbox, or conversation continuity.
 */
export async function renderVoicePreview(
  config: VoiceConfig,
  apiKey: string,
  socketFactory?: RealtimeSocketFactory,
): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  let settled = false
  let resolveAudio!: (audio: Buffer) => void
  let rejectAudio!: (error: Error) => void
  const audio = new Promise<Buffer>((resolve, reject) => {
    resolveAudio = resolve
    rejectAudio = reject
  })
  const provider = new DashScopeRealtime(
    config,
    apiKey,
    `只朗读系统提供的试听句子，保持原文，不回答问题，不调用工具。`,
    [],
    {
      onEvent(event) {
        if (settled) return
        if (event.type === 'response.audio.delta') {
          const delta = typeof event.delta === 'string' ? Buffer.from(event.delta, 'base64') : Buffer.alloc(0)
          if (delta.byteLength === 0) return
          size += delta.byteLength
          if (size > MAX_PREVIEW_PCM_BYTES) {
            settled = true
            rejectAudio(new Error('音色试听超过 15 秒上限。'))
            return
          }
          chunks.push(delta)
          return
        }
        if (event.type === 'error' || event.type === 'transport.closed') {
          settled = true
          rejectAudio(new Error('百炼音色试听连接失败。'))
          return
        }
        if (event.type === 'response.done') {
          settled = true
          if (size === 0) rejectAudio(new Error('百炼没有返回音频，请稍后重试。'))
          else resolveAudio(pcmToWav(Buffer.concat(chunks, size)))
        }
      },
    },
    socketFactory,
  )
  const timeout = setTimeout(() => {
    if (settled) return
    settled = true
    rejectAudio(new Error('音色试听请求超时。'))
  }, Math.max(config.connectTimeoutMs, 20_000))
  try {
    await provider.connect()
    provider.announceBackendEvent('voice-preview', VOICE_PREVIEW_TEXT)
    return await audio
  } finally {
    clearTimeout(timeout)
    provider.close()
  }
}

export function pcmToWav(pcm: Buffer): Buffer {
  const wav = Buffer.allocUnsafe(44 + pcm.byteLength)
  wav.write('RIFF', 0, 'ascii')
  wav.writeUInt32LE(36 + pcm.byteLength, 4)
  wav.write('WAVE', 8, 'ascii')
  wav.write('fmt ', 12, 'ascii')
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(AUDIO_CHANNELS, 22)
  wav.writeUInt32LE(OUTPUT_SAMPLE_RATE, 24)
  wav.writeUInt32LE(OUTPUT_SAMPLE_RATE * AUDIO_CHANNELS * PCM_SAMPLE_BYTES, 28)
  wav.writeUInt16LE(AUDIO_CHANNELS * PCM_SAMPLE_BYTES, 32)
  wav.writeUInt16LE(PCM_SAMPLE_BYTES * 8, 34)
  wav.write('data', 36, 'ascii')
  wav.writeUInt32LE(pcm.byteLength, 40)
  pcm.copy(wav, 44)
  return wav
}
