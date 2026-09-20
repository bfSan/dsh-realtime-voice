import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { Config } from '../src/host/config.ts'
import { renderVoicePreview } from '../src/host/voice-preview.ts'

class FakeSocket extends EventEmitter {
  readyState = WebSocket.OPEN
  bufferedAmount = 0
  readonly sent: Array<Record<string, unknown>> = []

  send(raw: string): void {
    const message = JSON.parse(raw) as Record<string, unknown>
    this.sent.push(message)
    if (message.type === 'session.update') queueMicrotask(() => this.event({ type: 'session.updated' }))
    if (message.type === 'response.create') queueMicrotask(() => {
      this.event({ type: 'response.created', response: { id: 'preview-response' } })
      this.event({
        type: 'response.audio.delta',
        response_id: 'preview-response',
        delta: Buffer.from([1, 0, 2, 0]).toString('base64'),
      })
      this.event({ type: 'response.done', response: { id: 'preview-response', status: 'completed' } })
    })
  }

  close(): void { this.readyState = WebSocket.CLOSED }
  event(value: Record<string, unknown>): void { this.emit('message', Buffer.from(JSON.stringify(value))) }
}

describe('voice preview', () => {
  it('renders a fixed text with the selected draft voice and returns a playable mono WAV', async () => {
    const socket = new FakeSocket()
    const wav = await renderVoicePreview(
      new Config({ voice: 'loongjohn', model: 'qwen-audio-3.0-realtime-flash' }),
      'secret-not-logged',
      ((url, options) => {
        expect(url.searchParams.get('model')).toBe('qwen-audio-3.0-realtime-flash')
        expect(options.headers?.Authorization).toBe('Bearer secret-not-logged')
        queueMicrotask(() => socket.event({ type: 'session.created' }))
        return socket as unknown as WebSocket
      }),
    )

    const session = socket.sent.find(message => message.type === 'session.update')?.session as Record<string, unknown>
    expect(session).toMatchObject({ voice: 'loongjohn', modalities: ['text', 'audio'], tools: [] })
    const prompt = socket.sent.find(message => message.type === 'conversation.item.create')
    expect(JSON.stringify(prompt)).toContain('你好，我是 DSH 语音总管，这是当前音色的试听。')
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE')
    expect(wav.readUInt32LE(24)).toBe(24_000)
    expect(wav.subarray(44)).toEqual(Buffer.from([1, 0, 2, 0]))
  })

  it('rejects an empty provider response instead of returning a broken audio file', async () => {
    const socket = new FakeSocket()
    socket.send = function (raw: string): void {
      const message = JSON.parse(raw) as Record<string, unknown>
      this.sent.push(message)
      if (message.type === 'session.update') queueMicrotask(() => this.event({ type: 'session.updated' }))
      if (message.type === 'response.create') queueMicrotask(() => {
        this.event({ type: 'response.created', response: { id: 'empty' } })
        this.event({ type: 'response.done', response: { id: 'empty', status: 'completed' } })
      })
    }
    await expect(renderVoicePreview(new Config({}), 'secret-not-logged', ((_url, _options) => {
      queueMicrotask(() => socket.event({ type: 'session.created' }))
      return socket as unknown as WebSocket
    }))).rejects.toThrow(/没有返回音频/)
  })
})
