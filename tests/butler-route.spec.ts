import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'
import type { VoiceConfig } from '../src/host/config.ts'
import { VOICE_BUTLER_ROUTE } from '../src/supervisor-protocol.ts'

const config: VoiceConfig = {
  endpoint: 'wss://example.invalid/realtime',
  temporaryKeyEndpoint: 'https://example.invalid/tokens',
  temporaryKeyTtlSeconds: 60,
  apiKeyEnv: 'DASHSCOPE_API_KEY',
  model: 'qwen-audio-3.0-realtime-plus',
  voice: 'longanqian',
  turnDetection: 'smart_turn',
  vadThreshold: 0.35,
  silenceDurationMs: 600,
  maxHistoryTurns: 20,
  maxConnections: 4,
  maxBinaryFrameBytes: 64 * 1024,
  connectTimeoutMs: 15_000,
}

interface Reply { status?: number; body?: string }

function mount() {
  const handlers = new Map<string, (request: any, response: any) => void>()
  const context = {
    webServer: {
      register: vi.fn((entry: { path: string; handler: (request: unknown, response: unknown) => void }) => {
        handlers.set(entry.path, entry.handler); return vi.fn()
      }),
      registerUpgrade: vi.fn(() => vi.fn()),
    },
    effect: vi.fn((factory: () => () => void | Promise<void>) => { factory() }),
    inject: vi.fn(),
  }
  apply(context as never, config)
  return handlers.get(VOICE_BUTLER_ROUTE)!
}

/** Minimal request stand-in that delivers its body the way Node's HTTP does. */
function post(body: string, remoteAddress = '127.0.0.1') {
  const reply: Reply = {}
  const response = {
    writeHead(status: number) { reply.status = status },
    end(payload?: string) { reply.body = payload },
  }
  const listeners = new Map<string, (chunk?: unknown) => void>()
  const request = {
    method: 'POST', socket: { remoteAddress }, headers: {}, url: VOICE_BUTLER_ROUTE,
    on(event: string, listener: (chunk?: unknown) => void) { listeners.set(event, listener); return request },
    destroy() {},
  }
  return { reply, request, response, listeners }
}

function get(remoteAddress = '127.0.0.1') {
  const reply: Reply = {}
  const response = {
    writeHead(status: number) { reply.status = status },
    end(payload?: string) { reply.body = payload },
  }
  return { reply, request: { method: 'GET', socket: { remoteAddress }, headers: {}, url: VOICE_BUTLER_ROUTE }, response }
}

describe('butler roster route', () => {
  it('rejects anything but loopback', () => {
    const route = mount()
    const remote = get('10.0.0.9')
    route(remote.request, remote.response)
    expect(remote.reply.status).toBe(403)
  })

  it('creates a butler and then lists it', () => {
    const route = mount()
    const empty = get()
    route(empty.request, empty.response)
    expect(JSON.parse(empty.reply.body!).butlers).toEqual([])

    const created = post('{"name":"运维"}')
    route(created.request, created.response)
    created.listeners.get('data')?.(Buffer.from('{"name":"运维"}'))
    created.listeners.get('end')?.()
    expect(created.reply.status).toBe(201)
    const id = JSON.parse(created.reply.body!).id
    expect(id).toBeTruthy()

    const listed = get()
    route(listed.request, listed.response)
    expect(JSON.parse(listed.reply.body!).butlers).toEqual([{ id, name: '运维' }])
  })

  it('refuses an unnamed butler and an oversized body', () => {
    const route = mount()
    const blank = post('{}')
    route(blank.request, blank.response)
    blank.listeners.get('data')?.(Buffer.from('{}'))
    blank.listeners.get('end')?.()
    expect(blank.reply.status).toBe(400)

    const huge = post('')
    route(huge.request, huge.response)
    huge.listeners.get('data')?.(Buffer.alloc(5 * 1024, 97))
    expect(huge.reply.status).toBe(413)
  })
})
