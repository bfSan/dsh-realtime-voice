import { parseSupervisorArguments } from '../supervisor-protocol.ts'
import { buildButlerBriefing, type ButlerRoster } from './butler-registry.ts'
import type { VoiceTaskDirectory } from './voice-task-directory.ts'
import { isReadOnlyReportIntent } from './voice-intent.ts'

export interface SupervisorActions {
  select(taskId: string): Promise<void> | void
  submit(instruction: string, spokenInput: string): Promise<unknown>
  cancel(): Promise<unknown>
}

/** One call routes to explicitly selected DSH tasks; the page's current chat is irrelevant. */
export class VoiceSupervisor {
  selectedTask: string | undefined
  /** Which butler answers this call; undefined means the roster default. */
  readonly butlerId: string | undefined
  private turn: { id: string; text: string } | undefined
  private selecting = false
  private readonly receipts = new Map<string, { fingerprint: string; result: Promise<unknown> }>()
  constructor(
    private readonly callId: string,
    private readonly directory: VoiceTaskDirectory,
    private readonly actions: SupervisorActions,
    private readonly butlers?: ButlerRoster,
    butlerId?: string,
  ) {
    this.butlerId = butlerId
  }
  private require<R>(value: R | undefined, message: string): R {
    if (value === undefined) throw new Error(message)
    return value
  }
  /** The butler answering right now: the named one, or the roster default. */
  private currentButler() {
    if (this.butlers === undefined) return undefined
    return this.butlerId === undefined ? this.butlers.resolveDefault() : this.butlers.get(this.butlerId)
  }
  userTurn(id: string, text: string): void {
    if (text.trim()) this.turn = { id, text: text.trim() }
  }
  reportMode(): void { this.turn = undefined }
  async select(taskId: string): Promise<void> {
    if (this.selecting) throw new Error('正在切换任务，请等待选择完成')
    this.selecting = true
    try {
      await this.directory.find(taskId)
      await this.actions.select(taskId)
      this.selectedTask = taskId
    } finally { this.selecting = false }
  }
  async execute(name: string, json: string): Promise<unknown> {
    const args = parseSupervisorArguments(name, json)
    switch (name) {
      case 'list_voice_projects': return this.directory.listProjects()
      case 'list_voice_agents': return this.directory.listAgents()
      case 'list_voice_tasks': return this.directory.listTasks()
      case 'read_voice_task_result':
        this.reportMode()
        return this.directory.readResult(args.taskId!)
      case 'select_voice_task':
        await this.select(args.taskId!)
        return { status: 'selected', taskId: this.selectedTask }
      case 'list_voice_butlers': {
        // The roster never blocks a call: without one there is simply nobody
        // to hand the call to, and the model must say so rather than invent.
        if (this.butlers === undefined) return { butlers: [] }
        return {
          butlers: this.butlers.list().map(butler => ({
            id: butler.id, name: butler.name, scope: butler.scope, pending: butler.memory.notes,
          })),
          ...(this.currentButler() === undefined ? {} : { current: this.currentButler()!.id }),
        }
      }
      case 'switch_voice_butler': {
        const registry = this.require(this.butlers, '语音总管名单不可用')
        const next = registry.get(args.butlerId!)
        if (next === undefined) throw new Error('语音总管不存在，请先从名单里选一位')
        ;(this as { butlerId: string | undefined }).butlerId = next.id
        return { status: 'switched', butler: { id: next.id, name: next.name }, briefing: buildButlerBriefing(next) }
      }
      case 'remember_voice_scope': {
        const registry = this.require(this.butlers, '语音总管名单不可用')
        const butler = this.require(this.currentButler(), '当前没有接听的语音总管')
        registry.setScope(butler.id, { keywords: [args.note!.slice(0, 200)] })
        return { status: 'remembered', butlerId: butler.id }
      }
      case 'note_voice_todo': {
        const registry = this.require(this.butlers, '语音总管名单不可用')
        const butler = this.require(this.currentButler(), '当前没有接听的语音总管')
        registry.addNote(butler.id, args.note!)
        return { status: 'noted', butlerId: butler.id }
      }
      case 'create_voice_task': {
        if (!this.turn || isReadOnlyReportIntent(this.turn.text)) return { status: 'needs-clarification', message: '请先询问用户要创建什么任务、使用哪个项目和 Agent。' }
        const task = await this.directory.createTask({
          workspace: args.workspace!, presetId: args.presetId!,
          requestId: `${this.callId}:${this.turn.id}:create`,
        })
        await this.select(task.taskId)
        return { status: 'created', ...task }
      }
      case 'submit_voice_task':
      case 'cancel_voice_task': {
        if (this.selecting) return { status: 'needs-clarification', message: '请等待任务切换完成，再确认工作对象。' }
        if (!this.selectedTask) return { status: 'needs-selection', message: '请先确认要安排或停止哪个任务。' }
        if (!this.turn || isReadOnlyReportIntent(this.turn.text)) {
          return { status: 'needs-clarification', message: '先确认汇报对象；听汇报请读取任务结果，不得改写为文件操作。执行工作需要用户明确下达新的要求。' }
        }
        const key = `${this.callId}:${this.turn.id}`
        const fingerprint = JSON.stringify([name, this.selectedTask, args])
        const previous = this.receipts.get(key)
        if (previous) return previous.fingerprint === fingerprint ? previous.result
          : { status: 'needs-clarification', message: '本轮已经提交过工作，请向用户确认下一步，不要重复提交或切换目标。' }
        const result = name === 'cancel_voice_task' ? this.actions.cancel()
          : this.actions.submit(args.instruction!, this.turn.text)
        this.receipts.set(key, { fingerprint, result })
        return result
      }
      default: throw new Error('Unknown supervisor tool')
    }
  }
}
