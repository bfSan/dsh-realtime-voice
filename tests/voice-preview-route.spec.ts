import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { createVoicePreviewHandler } from '../src/host/voice-preview-route.ts'

describe('voice preview HTTP route', () => {
  it('keeps credentials on the Host and returns only rendered WAV bytes', async () => {
    const resolve = vi.fn(async () => ({ value: 'host-secret-only' }))
    const render = vi.fn(async (config, key) => {
      expect(config).toMatchObject({ model: 'qwen-audio-3.0-realtime-flash', voice: 'loongjohn' })
      expect(key).toBe('host-secret-only')
      return Buffer.from('wav-bytes')
    })
    const handler = createVoicePreviewHandler(
      { credentials: { resolve }, logger: { warn: vi.fn() } } as never,
      () => new Config({}),
      () => true,
      render,
    )
    const result = response()
    handler(request(JSON.stringify({ model: 'qwen-audio-3.0-realtime-flash', voice: 'loongjohn' })), result.response)
    await vi.waitFor(() => expect(result.status).toBe(200))

    expect(resolve).toHaveBeenCalledTimes(1)
    expect(result.headers).toMatchObject({ 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' })
    expect(result.body).toEqual(Buffer.from('wav-bytes'))
  })

  it('rejects unknown model and voice before reading credentials', async () => {
    const resolve = vi.fn()
    const render = vi.fn()
    const handler = createVoicePreviewHandler(
      { credentials: { resolve }, logger: { warn: vi.fn() } } as never,
      () => new Config({}),
      () => true,
      render,
    )
    const result = response()
    handler(request(JSON.stringify({ model: 'latest', voice: 'forged' })), result.response)
    await vi.waitFor(() => expect(result.status).toBe(400))
    expect(resolve).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
  })
})

function request(body: string) {
  const stream = Readable.from([Buffer.from(body)]) as Readable & Record<string, unknown>
  stream.method = 'POST'
  stream.socket = { remoteAddress: '127.0.0.1' }
  stream.headers = { host: '127.0.0.1:3080', 'content-type': 'application/json' }
  return stream as never
}

function response() {
  const state: { status: number; headers: Record<string, string>; body: Buffer } = {
    status: 0, headers: {}, body: Buffer.alloc(0),
  }
  return {
    get status() { return state.status },
    get headers() { return state.headers },
    get body() { return state.body },
    response: {
      writeHead(status: number, headers: Record<string, string> = {}) { state.status = status; state.headers = headers },
      end(chunk?: string | Buffer) { state.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk ?? '') },
    },
  }
}
