import { createHash } from 'node:crypto'
import { assistantText } from './dsh-session-state.ts'

export interface VoiceProject { id: string; path: string; title: string }
export interface VoiceAgent { id: string; name?: string; broken?: unknown }
export interface TaskRef { taskId: string; sessionId: string; workspace: string; presetId: string }
export interface DirectoryTask {
  sessionId: string; running: boolean; blank: boolean; cwd?: string
  projections?: { values?: unknown }
}
export interface VoiceDirectorySource {
  projects(): Promise<VoiceProject[]>
  agents(): Promise<VoiceAgent[]>
  tasks(): Promise<readonly DirectoryTask[]>
  history(sessionId: string): Promise<unknown[]>
  create(input: { workspaceId: string; cwd: string; agentPreset: string; sessionId: string }): Promise<{ sessionId: string }>
}

/** Reads facts from DSH. No query method ever submits a prompt. */
export class VoiceTaskDirectory {
  private readonly creates = new Map<string, { fingerprint: string; result: Promise<TaskRef> }>()
  constructor(private readonly source: VoiceDirectorySource) {}
  listProjects() { return this.source.projects() }
  listAgents() { return this.source.agents() }
  async listTasks() {
    return (await this.source.tasks()).map(task => {
      const values = task.projections?.values as Record<string, unknown> | undefined
      const title = values?.title
      const titleValue = typeof title === 'object' && title !== null ? (title as Record<string, unknown>).title : title
      return { taskId: task.sessionId, ...task, title: typeof titleValue === 'string' ? titleValue : task.sessionId }
    })
  }
  async find(taskId: string) {
    const task = (await this.listTasks()).find(row => row.taskId === taskId)
    if (task === undefined) throw new Error('任务不存在或已不可访问，请重新选择')
    return task
  }
  async readResult(taskId: string) {
    const task = await this.find(taskId)
    const events = await this.source.history(taskId)
    const texts = new Map<number, string>()
    let result: { state: string; text?: string; turn?: number; seq?: number } = { state: 'no-result' }
    for (const raw of events) {
      if (typeof raw !== 'object' || raw === null) continue
      const event = raw as { type?: string; seq?: number; data?: { turn?: number; reason?: unknown } }
      const turn = event.data?.turn
      if (typeof turn !== 'number') continue
      const text = assistantText(raw)
      if (text !== undefined) texts.set(turn, text)
      if (event.type !== 'turn/end') continue
      const reason = event.data?.reason
      const kind = typeof reason === 'string' ? reason
        : typeof reason === 'object' && reason !== null ? (reason as { kind?: unknown }).kind : undefined
      const finalText = texts.get(turn)
      result = {
        state: kind === 'completed' ? 'completed'
          : ['cancelled', 'interrupted', 'aborted'].includes(String(kind)) ? 'cancelled'
            : ['error', 'failed', 'blocked', 'max-tokens'].includes(String(kind)) ? 'failed' : 'ended',
        turn, ...(event.seq === undefined ? {} : { seq: event.seq }),
        ...(finalText === undefined ? {} : { text: finalText.slice(0, 12_000) }),
      }
    }
    return { taskId, sessionId: task.sessionId, running: task.running, source: 'dsh-session-history', ...result }
  }
  async createTask(input: { workspace: string; presetId: string; requestId: string }): Promise<TaskRef> {
    if (!input.requestId.trim()) throw new Error('新任务缺少请求标识')
    const fingerprint = JSON.stringify([input.workspace, input.presetId])
    const old = this.creates.get(input.requestId)
    if (old !== undefined) {
      if (old.fingerprint !== fingerprint) throw new Error('同一请求不能创建不同目标，请先确认')
      return old.result
    }
    const result = this.performCreate(input)
    this.creates.set(input.requestId, { fingerprint, result })
    return result
  }
  private async performCreate(input: { workspace: string; presetId: string; requestId: string }): Promise<TaskRef> {
    const project = (await this.listProjects()).find(row => row.id === input.workspace)
    const agent = (await this.listAgents()).find(row => row.id === input.presetId && !row.broken)
    if (project === undefined || agent === undefined) throw new Error('请先选择有效的项目和 Agent')
    const stableId = `session-${createHash('sha256').update(input.requestId).digest('hex').slice(0, 32)}`
    const created = await this.source.create({
      workspaceId: project.id, cwd: project.path, agentPreset: agent.id, sessionId: stableId,
    })
    return { taskId: created.sessionId, sessionId: created.sessionId, workspace: project.path, presetId: agent.id }
  }
}
