import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { VoiceConnection } from '../src/host/voice-connection.ts'
import { VoiceTaskDirectory } from '../src/host/voice-task-directory.ts'

const provider = vi.hoisted(() => ({
  connect: vi.fn(async () => {}), close: vi.fn(), updateInstructions: vi.fn(),
}))
vi.mock('../src/host/dashscope-realtime.ts', () => ({
  DashScopeRealtime: class {
    connect = provider.connect
    close = provider.close
    updateInstructions = provider.updateInstructions
  },
}))

it('negotiates an independent call without reading or creating an execution session', async () => {
  const socket = Object.assign(new EventEmitter(), {
    OPEN: 1, CONNECTING: 0, readyState: 1, sent: [] as string[],
    send(value: string) { this.sent.push(value) }, close: vi.fn(),
  })
  const list = vi.fn(), create = vi.fn(), prompt = vi.fn()
  const directory = new VoiceTaskDirectory({
    tasks: list, projects: vi.fn(), agents: vi.fn(), history: vi.fn(), create,
  })
  const connection = new VoiceConnection({
    logger: { warn: vi.fn(), info: vi.fn() },
    credentials: { resolve: async () => ({ value: 'test-fixture-only' }) },
    apiProxy: { sessions: { list, prompt } },
  } as never, socket as never, {} as never, new Config({} as never), vi.fn(),
  undefined, undefined, {}, directory)
  socket.emit('message', Buffer.from(JSON.stringify({
    type: 'voice.hello', protocol: 'dsh.voice.supervisor.v1', requestId: 'r',
    client: { platform: 'web', version: 'test', binaryWebSocket: true, playbackClear: true,
      pcmS16leVerified: true, foregroundOnly: false, duplex: 'full', playbackDrainAck: true },
    audio: {
      input: { encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameDurationMs: 40 },
      output: { encoding: 'pcm_s16le', sampleRate: 24000, channels: 1, frameDurationMs: 40 },
    },
  })), false)
  await vi.waitFor(() => expect(socket.sent.map(line => JSON.parse(line))).toContainEqual(
    expect.objectContaining({ type: 'voice.ready', protocol: 'dsh.voice.supervisor.v1' }),
  ))
  expect(list).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
  expect(prompt).not.toHaveBeenCalled()
  connection.dispose()
})
