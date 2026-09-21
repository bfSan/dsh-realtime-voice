import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { VoiceConnection } from '../src/host/voice-connection.ts'
import { VoiceTaskDirectory } from '../src/host/voice-task-directory.ts'
import { ButlerRegistry } from '../src/host/butler-registry.ts'

const captured = vi.hoisted(() => ({ instructions: '' }))
vi.mock('../src/host/dashscope-realtime.ts', () => ({
  DashScopeRealtime: class {
    constructor(_config: unknown, _key: string, instructions: string) { captured.instructions = instructions }
    connect = vi.fn(async () => {})
    close = vi.fn()
    updateInstructions = vi.fn()
  },
}))

function hello(butlerId?: string) {
  return {
    type: 'voice.hello', protocol: 'dsh.voice.supervisor.v1', requestId: 'r',
    ...(butlerId === undefined ? {} : { butlerId }),
    client: { platform: 'web', version: 'test', binaryWebSocket: true, playbackClear: true,
      pcmS16leVerified: true, foregroundOnly: false, duplex: 'full', playbackDrainAck: true },
    audio: {
      input: { encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameDurationMs: 40 },
      output: { encoding: 'pcm_s16le', sampleRate: 24000, channels: 1, frameDurationMs: 40 },
    },
  }
}

function mount() {
  const socket = Object.assign(new EventEmitter(), {
    OPEN: 1, CONNECTING: 0, readyState: 1, sent: [] as string[],
    send(value: string) { this.sent.push(value) }, close: vi.fn(),
  })
  const registry = new ButlerRegistry()
  registry.create('运维')
  const writing = registry.create('写作')
  const directory = new VoiceTaskDirectory({
    tasks: vi.fn(async () => []), projects: vi.fn(async () => []), agents: vi.fn(async () => []),
    history: vi.fn(async () => []), create: vi.fn(),
  })
  const connection = new VoiceConnection({
    logger: { warn: vi.fn(), info: vi.fn() },
    credentials: { resolve: async () => ({ value: 'test-fixture-only' }) },
    apiProxy: { sessions: { list: vi.fn(), prompt: vi.fn() } },
  } as never, socket as never, {} as never, new Config({} as never), vi.fn(),
  undefined, undefined, {}, directory, registry)
  return { socket, connection, registry, writing }
}

it('leases the butler target and briefs the model with that butler only', async () => {
  const { socket, connection, writing } = mount()
  socket.emit('message', Buffer.from(JSON.stringify(hello(writing.id))), false)
  await vi.waitFor(() => expect(socket.sent.map(line => JSON.parse(line))).toContainEqual(
    expect.objectContaining({ type: 'voice.ready', protocol: 'dsh.voice.supervisor.v1' }),
  ))
  await vi.waitFor(() => expect(captured.instructions).toContain('写作'))
  expect(captured.instructions).not.toContain('运维')
  connection.dispose()
})
