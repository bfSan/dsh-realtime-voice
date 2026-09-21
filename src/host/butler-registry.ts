/**
 * The roster of voice butlers.
 *
 * A butler is the identity the user calls: it owns a scope (what it looks
 * after) and a short memory of the tasks it already ran. It is an index over
 * DSH sessions, never a second source of truth — DSH still owns the
 * transcripts, and every summary here may be corrected out loud.
 */

export const MAX_BUTLER_TASKS = 20
export const MAX_BUTLER_NOTES = 20
/** One spoken briefing cannot carry an unbounded history. */
export const MAX_BUTLER_SUMMARY_LENGTH = 200

export interface ButlerScope {
  projects?: string[]
  keywords?: string[]
  defaultAgentPresetId?: string
}

export interface ButlerTaskRef {
  sessionId: string
  title: string
  projectId?: string
  presetId?: string
  lastTouchedAt: number
  lastSummary: string
}

export interface ButlerMemory {
  tasks: ButlerTaskRef[]
  notes: string[]
}

export interface VoiceButler {
  id: string
  name: string
  createdAt: number
  lastUsedAt: number
  scope: ButlerScope
  memory: ButlerMemory
}

export interface StoredButlers {
  schemaVersion: 1
  butlers: VoiceButler[]
  defaultButlerId?: string
}

function slugify(name: string, taken: ReadonlySet<string>): string {
  const base = name.trim().replace(/\s+/g, '-').replace(/[/\\]/g, '-').slice(0, 32) || 'butler'
  if (!taken.has(base)) return base
  for (let index = 2; ; index += 1) {
    const candidate = `${base}-${index}`
    if (!taken.has(candidate)) return candidate
  }
}

function trimTasks(tasks: readonly ButlerTaskRef[]): ButlerTaskRef[] {
  return [...tasks]
    .sort((left, right) => right.lastTouchedAt - left.lastTouchedAt)
    .slice(0, MAX_BUTLER_TASKS)
}

export class ButlerRegistry {
  private readonly butlers = new Map<string, VoiceButler>()
  private defaultButler: string | undefined
  private onChange: (() => void) | undefined

  setOnChange(listener: (() => void) | undefined): void { this.onChange = listener }

  private changed(): void { this.onChange?.() }

  create(name: string): VoiceButler {
    const id = slugify(name, new Set(this.butlers.keys()))
    const now = Date.now()
    const butler: VoiceButler = {
      id, name: name.trim() || id, createdAt: now, lastUsedAt: now,
      scope: {}, memory: { tasks: [], notes: [] },
    }
    this.butlers.set(id, butler)
    this.defaultButler ??= id
    this.changed()
    return butler
  }

  rename(id: string, name: string): VoiceButler {
    const butler = this.require(id)
    butler.name = name.trim() || butler.name
    butler.lastUsedAt = Date.now()
    this.changed()
    return butler
  }

  get(id: string): VoiceButler | undefined { return this.butlers.get(id) }

  list(): readonly VoiceButler[] {
    return [...this.butlers.values()].sort((left, right) => right.lastUsedAt - left.lastUsedAt)
  }

  remove(id: string): boolean {
    const deleted = this.butlers.delete(id)
    if (deleted && this.defaultButler === id) this.defaultButler = [...this.butlers.keys()][0]
    if (deleted) this.changed()
    return deleted
  }

  setDefault(id: string): void {
    this.require(id)
    this.defaultButler = id
    this.changed()
  }

  defaultId(): string | undefined { return this.defaultButler }

  /** Default butler for a new call: the default one, or the first known. */
  resolveDefault(): VoiceButler | undefined {
    if (this.defaultButler !== undefined) {
      const butler = this.butlers.get(this.defaultButler)
      if (butler !== undefined) return butler
    }
    return [...this.butlers.values()][0]
  }

  touch(id: string, task: ButlerTaskRef): void {
    const butler = this.require(id)
    const others = butler.memory.tasks.filter(row => row.sessionId !== task.sessionId)
    butler.memory.tasks = trimTasks([...others, {
      ...task, lastSummary: task.lastSummary.slice(0, MAX_BUTLER_SUMMARY_LENGTH),
    }])
    butler.lastUsedAt = Date.now()
    this.changed()
  }

  setScope(id: string, scope: ButlerScope): void {
    const butler = this.require(id)
    butler.scope = { ...butler.scope, ...scope }
    butler.lastUsedAt = Date.now()
    this.changed()
  }

  addNote(id: string, note: string): void {
    const butler = this.require(id)
    const notes = [note.trim(), ...butler.memory.notes].filter(row => row.length > 0)
    butler.memory.notes = notes.slice(0, MAX_BUTLER_NOTES)
    butler.lastUsedAt = Date.now()
    this.changed()
  }

  snapshot(): StoredButlers {
    return {
      schemaVersion: 1,
      butlers: this.list().map(butler => ({
        ...butler,
        scope: { ...butler.scope },
        memory: { tasks: [...butler.memory.tasks], notes: [...butler.memory.notes] },
      })),
      ...(this.defaultButler === undefined ? {} : { defaultButlerId: this.defaultButler }),
    }
  }

  restore(stored: StoredButlers): void {
    this.butlers.clear()
    for (const butler of stored.butlers) this.butlers.set(butler.id, butler)
    this.defaultButler = stored.defaultButlerId
  }

  private require(id: string): VoiceButler {
    const butler = this.butlers.get(id)
    if (butler === undefined) throw new Error('语音总管不存在，请重新选择')
    return butler
  }
}

/**
 * The identity block injected into the realtime model at call setup.
 *
 * Deliberately short and path-free: this is what the caller hears first, so it
 * carries who the butler is, what it looks after, and the one task it last
 * touched — nothing about any other butler.
 */
export function buildButlerBriefing(butler: VoiceButler): string {
  const lines = [`你是用户指定的语音总管「${butler.name}」。`]
  const scope = [
    ...(butler.scope.projects ?? []),
    ...(butler.scope.keywords ?? []),
  ]
  lines.push(scope.length === 0
    ? '你还没有固定负责范围，先用一句话确认本次要动的项目。'
    : `你负责的范围：${scope.join('、')}。`)
  const latest = butler.memory.tasks[0]
  lines.push(latest === undefined
    ? '你上次没有跟进中的任务，先问清楚这次要做什么。'
    : `你上次跟进：${latest.title} — ${latest.lastSummary}。`)
  return lines.join('\n')
}
