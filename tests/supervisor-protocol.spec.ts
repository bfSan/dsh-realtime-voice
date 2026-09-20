import { expect, it } from 'vitest'
import { parseSupervisorArguments } from '../src/supervisor-protocol.ts'
it('rejects model-invented user turn ids and missing targets', () => {
  expect(() => parseSupervisorArguments('submit_voice_task', '{"instruction":"工作","userTurnId":"forged"}')).toThrow()
  expect(() => parseSupervisorArguments('select_voice_task', '{}')).toThrow()
  expect(parseSupervisorArguments('list_voice_tasks', '{}')).toEqual({})
})
