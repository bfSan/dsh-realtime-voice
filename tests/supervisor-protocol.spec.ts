import { expect, it } from 'vitest'
import { isSupervisorHello, parseSupervisorArguments, SUPERVISOR_TOOL_NAMES } from '../src/supervisor-protocol.ts'
it('rejects model-invented user turn ids and missing targets', () => {
  expect(() => parseSupervisorArguments('submit_voice_task', '{"instruction":"工作","userTurnId":"forged"}')).toThrow()
  expect(() => parseSupervisorArguments('select_voice_task', '{}')).toThrow()
  expect(parseSupervisorArguments('list_voice_tasks', '{}')).toEqual({})
})

const pcm = { encoding: 'pcm_s16le', sampleRate: 24_000, channels: 1, frameDurationMs: 40 }
const supervisorHello = {
  type: 'voice.hello',
  protocol: 'dsh.voice.supervisor.v1',
  requestId: 'req-1',
  client: {
    platform: 'web',
    version: '0.1.0-alpha.23',
    binaryWebSocket: true,
    playbackClear: true,
    pcmS16leVerified: true,
    foregroundOnly: false,
    duplex: 'full',
  },
  audio: { input: pcm, output: pcm },
}

it('carries the butler id and validates the new tools', () => {
  expect(isSupervisorHello({ ...supervisorHello, butlerId: 'b1' })).toBe(true)
  expect(isSupervisorHello(supervisorHello)).toBe(true)
  expect(isSupervisorHello({ ...supervisorHello, butlerId: '' })).toBe(false)
  expect(SUPERVISOR_TOOL_NAMES).toContain('switch_voice_butler')
  expect(parseSupervisorArguments('switch_voice_butler', '{"butlerId":"b1"}')).toEqual({ butlerId: 'b1' })
  expect(() => parseSupervisorArguments('switch_voice_butler', '{"name":"x"}')).toThrow()
  expect(parseSupervisorArguments('note_voice_todo', '{"note":"跟进部署"}')).toEqual({ note: '跟进部署' })
})
