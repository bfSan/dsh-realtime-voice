import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'
import type { VoiceConfig } from '../src/host/config.ts'
import { VOICE_ROUTE } from '../src/protocol.ts'
import { VOICE_INBOX_ROUTE } from '../src/protocol.ts'
import { VOICE_DIRECT_ROUTE, VOICE_DIRECT_STATUS_ROUTE } from '../src/direct-protocol.ts'

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

describe('Host plugin lifecycle', () => {
  it('registers the call route and occupancy endpoint and unregisters both on dispose', async () => {
    const unregister = vi.fn()
    const unregisterStatus = vi.fn()
    const registerUpgrade = vi.fn(() => unregister)
    const register = vi.fn(() => unregisterStatus)
    let lifecycle: (() => void | Promise<void>) | undefined
    const context = {
      webServer: { register, registerUpgrade },
      effect: vi.fn((factory: () => () => void | Promise<void>) => {
        lifecycle = factory()
      }),
      // Settings is an optional Host service; this lifecycle unit deliberately
      // exercises the no-settings composition.
      inject: vi.fn(),
    }

    apply(context as never, config)
    expect(registerUpgrade).toHaveBeenCalledTimes(2)
    expect(registerUpgrade.mock.calls[0]?.[0]).toMatchObject({ path: VOICE_ROUTE })
    expect(registerUpgrade.mock.calls[1]?.[0]).toMatchObject({ path: VOICE_DIRECT_ROUTE })
    expect(register).toHaveBeenCalledTimes(3)
    expect(register.mock.calls[0]?.[0]).toMatchObject({ kind: 'exact', path: `${VOICE_ROUTE}/status` })
    expect(register.mock.calls[1]?.[0]).toMatchObject({ kind: 'exact', path: VOICE_DIRECT_STATUS_ROUTE })
    expect(register.mock.calls[2]?.[0]).toMatchObject({ kind: 'exact', path: VOICE_INBOX_ROUTE })
    expect(lifecycle).toBeTypeOf('function')

    await lifecycle?.()
    expect(unregister).toHaveBeenCalledTimes(2)
    expect(unregisterStatus).toHaveBeenCalledTimes(3)
  })

  it('serves the call-back inbox over loopback only, and dismisses by id', async () => {
    const handlers = new Map<string, (request: unknown, response: unknown) => void>()
    const context = {
      webServer: {
        register: vi.fn((entry: { path: string; handler: (request: unknown, response: unknown) => void }) => {
          handlers.set(entry.path, entry.handler)
          return vi.fn()
        }),
        registerUpgrade: vi.fn(() => vi.fn()),
      },
      effect: vi.fn((factory: () => () => void | Promise<void>) => { factory() }),
      inject: vi.fn(),
    }
    apply(context as never, config)
    const handler = handlers.get(VOICE_INBOX_ROUTE)
    expect(handler).toBeTypeOf('function')

    const remote = respond()
    handler?.({ method: 'GET', socket: { remoteAddress: '10.0.0.9' }, headers: {} }, remote.response)
    expect(remote.status).toBe(403)

    const loopback = respond()
    handler?.({ method: 'GET', socket: { remoteAddress: '127.0.0.1' }, headers: {}, url: VOICE_INBOX_ROUTE }, loopback.response)
    expect(loopback.status).toBe(200)
    expect(JSON.parse(loopback.body)).toMatchObject({ protocol: 'dsh.voice.v1', entries: [] })

    const wrongMethod = respond()
    handler?.({ method: 'POST', socket: { remoteAddress: '127.0.0.1' }, headers: {} }, wrongMethod.response)
    expect(wrongMethod.status).toBe(405)
  })

  it('registers the built-in reporting skill once the skills service is injected', () => {
    const register = vi.fn(() => vi.fn())
    const injections = new Map<string, (ctx: unknown) => void>()
    const context = {
      webServer: { register: vi.fn(() => vi.fn()), registerUpgrade: vi.fn(() => vi.fn()) },
      effect: vi.fn((factory: () => () => void | Promise<void>) => { factory() }),
      inject: vi.fn((services: string[], callback: (ctx: unknown) => void) => {
        for (const service of services) injections.set(service, callback)
      }),
    }
    apply(context as never, config)

    const skills = injections.get('skills')
    expect(skills).toBeTypeOf('function')
    skills?.({ skills: { register }, effect: (factory: () => () => void) => { factory() }, logger: { warn: vi.fn() } })
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: 'dsh-voice-supervisor' }))
  })
})

function respond() {
  const state = { status: 0, body: '' }
  return {
    get status() { return state.status },
    get body() { return state.body },
    response: {
      writeHead(status: number) { state.status = status },
      end(chunk?: string) { state.body = chunk ?? '' },
    },
  }
}
