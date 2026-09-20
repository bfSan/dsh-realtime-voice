import { isVoiceClientControl, VOICE_PROTOCOL, type VoiceHello } from './protocol.ts'
import type { DirectFunctionTool } from './direct-protocol.ts'

export const VOICE_SUPERVISOR_PROTOCOL = 'dsh.voice.supervisor.v1' as const
export const VOICE_DIRECTORY_ROUTE = '/api/realtime-voice/directory'
export interface SupervisorHello extends Omit<VoiceHello, 'protocol' | 'target'> {
  protocol: typeof VOICE_SUPERVISOR_PROTOCOL
  target?: { sessionId: string }
}
export function isSupervisorHello(raw: unknown): raw is SupervisorHello {
  if (typeof raw !== 'object' || raw === null) return false
  const value = raw as Record<string, unknown>
  return value.protocol === VOICE_SUPERVISOR_PROTOCOL && value.type === 'voice.hello'
    && isVoiceClientControl({ ...value, protocol: VOICE_PROTOCOL, target: value.target ?? { sessionId: 'supervisor' } })
}
export const SUPERVISOR_TOOL_NAMES = [
  'list_voice_projects', 'list_voice_agents', 'list_voice_tasks', 'read_voice_task_result',
  'select_voice_task', 'create_voice_task', 'submit_voice_task', 'cancel_voice_task',
] as const
export type SupervisorToolName = typeof SUPERVISOR_TOOL_NAMES[number]
const descriptions: Record<SupervisorToolName, string> = {
  list_voice_projects: '列出 DSH 已登记项目。',
  list_voice_agents: '列出 DSH 可用执行 Agent preset。',
  list_voice_tasks: '列出已有任务；不创建任务，不执行工作。',
  read_voice_task_result: '读取指定任务的权威终态和结果，用于口头汇报。空闲不代表没有结果。',
  select_voice_task: '明确选择用户指定的已有执行任务，不能擅自推断目标。',
  create_voice_task: '用户明确要求新任务并确认项目及 Agent 后创建空白执行任务，不自动执行。',
  submit_voice_task: '用户新一轮明确下达工作后提交到已选任务；正在执行时补充会 steer。听汇报不得调用。',
  cancel_voice_task: '用户明确要求停止时取消已选择的任务。',
}
export const SUPERVISOR_TOOLS: readonly DirectFunctionTool[] = SUPERVISOR_TOOL_NAMES.map(name => {
  const properties = name === 'create_voice_task'
    ? { workspace: { type: 'string' }, presetId: { type: 'string' } }
    : name === 'submit_voice_task'
      ? { instruction: { type: 'string', maxLength: 12_000 } }
      : name === 'select_voice_task' || name === 'read_voice_task_result'
        ? { taskId: { type: 'string' } } : {}
  return {
    type: 'function', function: {
      name, description: descriptions[name],
      parameters: { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) },
    },
  }
})
export function parseSupervisorArguments(name: string, json: string): Record<string, string> {
  const tool = SUPERVISOR_TOOLS.find(value => value.function.name === name)
  if (tool === undefined || json.length > 16_384) throw new Error('Unknown or oversized supervisor call')
  const value: unknown = JSON.parse(json)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object arguments')
  const keys = Object.keys((tool.function.parameters as { properties: object }).properties)
  const record = value as Record<string, unknown>
  if (Object.keys(record).some(key => !keys.includes(key))
    || keys.some(key => typeof record[key] !== 'string' || !(record[key] as string).trim()
      || (record[key] as string).length > 12_000)) throw new Error('Invalid supervisor arguments')
  return record as Record<string, string>
}
