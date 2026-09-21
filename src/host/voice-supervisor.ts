import { parseSupervisorArguments } from '../supervisor-protocol.ts'
import { buildButlerBriefing, type ButlerRoster } from './butler-registry.ts'
import type { VoiceTaskDirectory } from './voice-task-directory.ts'
import { isConfirmationUtterance, isReadOnlyReportIntent } from './voice-intent.ts'

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
  /**
   * The task object waiting for the user to confirm it out loud.
   *
   * Selection is deliberately two-step. The model used to bind whatever
   * session it inferred from a list, which is how a spoken request landed on
   * the wrong conversation: the list carries titles, not intent, and guessing
   * between two similarly named tasks is not recoverable once work starts.
   * Proposing first and binding only on an explicit "对/可以/就这个" makes the
   * user the one who picks, and leaves the model nothing to infer.
   */
  private pendingSelection: { taskId: string; title: string } | undefined
  /** The creation the user is being asked to approve. */
  private pendingCreation: { workspaceId: string; presetId: string } | undefined
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
  reportMode(): void {
    this.turn = undefined
    this.pendingSelection = undefined
    this.pendingCreation = undefined
  }
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
      case 'select_voice_task': {
        // Propose only. Binding here is what allowed a wrong session to be
        // picked; the user confirms through `confirm_voice_task`.
        const task = await this.directory.find(args.taskId!)
        const title = typeof task.title === 'string' ? task.title : args.taskId!
        this.pendingSelection = { taskId: args.taskId!, title }
        return {
          status: 'awaiting-confirmation',
          taskId: args.taskId!,
          title,
          message: `请先用一句口语把这个任务念给用户听，例如“是「${title}」这个任务吗”，等他亲口说对，再调用 confirm_voice_task。`,
        }
      }
      case 'confirm_voice_task': {
        const pending = this.pendingSelection
        if (pending === undefined) {
          return { status: 'needs-selection', message: '还没有向用户确认过任何任务。请先提出一个任务，并等用户口头确认。' }
        }
        if (!this.turn || !isConfirmationUtterance(this.turn.text)) {
          // Fail closed: an unclear answer must not authorize binding a real
          // DSH session, because work would then run in the wrong place.
          return {
            status: 'not-confirmed',
            message: '用户这一句不是明确的确认。请把这个任务的名称再念一遍，并问一句“是这个吗”，不要开始工作。',
          }
        }
        // An empty task id marks a proposed *creation*: the object does not
        // exist yet, so confirming it is what brings the session into being.
        if (pending.taskId === '') {
          const creation = this.pendingCreation
          if (creation === undefined) {
            return { status: 'needs-clarification', message: '还没有确认好要创建什么任务，请重新说明项目和 Agent。' }
          }
          const task = await this.directory.createTask({
            workspace: creation.workspaceId, presetId: creation.presetId,
            requestId: `${this.callId}:${this.turn.id}:create`,
          })
          this.pendingSelection = undefined
          this.pendingCreation = undefined
          // "对，就这个" was spent answering the question; it is not the work
          // order, so it must not be replayed as one on the next submit.
          this.turn = undefined
          await this.select(task.taskId)
          return { status: 'created', ...task }
        }
        await this.select(pending.taskId)
        this.pendingSelection = undefined
        this.turn = undefined
        return { status: 'selected', taskId: this.selectedTask, title: pending.title }
      }
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
        // Same two-step rule as selection: naming a project and an Agent is a
        // proposal until the user agrees to work in that place.
        const [projects, agents] = await Promise.all([this.directory.listProjects(), this.directory.listAgents()])
        const project = projects.find(row => row.id === args.workspace)
        const agent = agents.find(row => row.id === args.presetId && !row.broken)
        if (project === undefined || agent === undefined) {
          return { status: 'needs-clarification', message: '用户给的项目或 Agent 不在可用列表里。请先念出可选项，让用户重新指定。' }
        }
        this.pendingSelection = { taskId: '', title: `${project.title || project.path} / ${agent.name ?? agent.id}` }
        this.pendingCreation = { workspaceId: project.id, presetId: agent.id }
        return {
          status: 'awaiting-create-confirmation',
          workspace: project.id,
          presetId: agent.id,
          title: this.pendingSelection.title,
          message: `请用口语告诉用户“我要在${project.title || project.path}用${agent.name ?? agent.id}开一个新任务”，等他亲口同意后再调用 confirm_voice_task。`,
        }
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
