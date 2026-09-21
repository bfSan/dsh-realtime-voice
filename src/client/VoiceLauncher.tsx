import { useEffect, useRef, useState } from 'react'
import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { VoiceSnapshot } from './controller.ts'
import { VOICE_DIRECTORY_ROUTE } from '../supervisor-protocol.ts'
import styles from './voice.module.css'

export interface VoiceLauncherInjected {
  hooks: { voice: HostObservable<VoiceSnapshot> }
  startSupervisor(): Promise<void>
  /** Call a named butler; omitted means the default one. */
  startButler?(butlerId: string): Promise<void>
  selectTask(taskId: string): Promise<void>
  createTask(workspace: string, presetId: string): Promise<void>
  createButler(name: string): Promise<string>
  butlers: readonly { id: string; name: string }[]
}
type Props = PropsRuntime<'shell.overlay'> & InjectFace<VoiceLauncherInjected>
interface Directory {
  projects: { id: string; title: string; path: string }[]
  agents: { id: string; name?: string; broken?: unknown }[]
  tasks: { taskId: string; title: string; cwd?: string; running: boolean }[]
}

/** How long the ball must be held before the butler panel opens. */
const LONG_PRESS_MS = 500

/**
 * Always mounted: no current conversation is needed to place a call.
 *
 * The resting state is a single dial ball — one click connects to the default
 * butler. Choosing or creating a butler lives behind a long press or a right
 * click, so the everyday gesture stays "call someone who knows me".
 */
export function VoiceLauncher({ useVoice, startSupervisor, startButler, selectTask, createTask, createButler, butlers }: Props) {
  const voice = useVoice(value => value)
  const [open, setOpen] = useState(false)
  const [directory, setDirectory] = useState<Directory>()
  const [error, setError] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [preset, setPreset] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingTask, setPendingTask] = useState('')
  const [butlerName, setButlerName] = useState('')
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressed = useRef(false)
  const connected = voice.supervisor && ['listening', 'thinking', 'speaking', 'agent-working'].includes(voice.phase)
  useEffect(() => {
    if (!open) return
    const abort = new AbortController()
    void fetch(VOICE_DIRECTORY_ROUTE, { cache: 'no-store', signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('目录暂不可用，请关闭菜单后重试')
      setDirectory(await response.json() as Directory)
    }).catch(err => { if (!abort.signal.aborted) setError(String(err)) })
    return () => abort.abort()
  }, [open, voice.sessionId])
  useEffect(() => {
    if (voice.sessionId === pendingTask || voice.error) setPendingTask('')
  }, [voice.sessionId, voice.error, pendingTask])
  useEffect(() => () => clearTimeout(pressTimer.current), [])
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (err) { setError(String(err)) } finally { setBusy(false) }
  }
  function beginPress(): void {
    longPressed.current = false
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => { longPressed.current = true; setOpen(true) }, LONG_PRESS_MS)
  }
  function endPress(): void { clearTimeout(pressTimer.current) }
  function click(): void {
    // A long press already opened the panel; it must not also dial.
    if (longPressed.current) { longPressed.current = false; return }
    if (voice.phase !== 'idle' && voice.phase !== 'error') return
    void run(startSupervisor)
  }
  return <aside className={styles.launcher} aria-label="语音总管">
    <button
      type="button"
      className={`${styles.dialBall} ${connected ? styles.dialBallActive : ''}`}
      aria-label="打给语音总管"
      title="单击打给语音总管；长按或右键选择/新建总管"
      aria-expanded={open}
      onPointerDown={beginPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onContextMenu={event => { event.preventDefault(); setOpen(true) }}
      onClick={click}
    >
      <span className={styles.dialBallGlyph} aria-hidden="true" />
    </button>
    {!open ? null : <section className={styles.launcherMenu} aria-label="选择或新建语音总管">
      <strong>语音总管</strong>
      <p>单击圆球直接打给默认总管；这里可以选择已有的某一位，或新安排一位。</p>
      <div className={styles.launcherTasks}>
        <button type="button" disabled={busy || (voice.phase !== 'idle' && voice.phase !== 'error')}
          aria-pressed={voice.supervisor === true && butlers.every(row => row.id !== voice.butlerId)}
          onClick={() => void run(startSupervisor)}>默认总管</button>
        {butlers.map(butler =>
          <button type="button" key={butler.id}
            disabled={busy || !startButler || (voice.phase !== 'idle' && voice.phase !== 'error')}
            aria-pressed={voice.supervisor === true && voice.butlerId === butler.id}
            onClick={() => void run(async () => { await startButler?.(butler.id) })}>{butler.name}</button>)}
        {butlers.length === 0 ? <p>还没有总管，先新安排一位。</p> : null}
      </div>
      <label>新总管称呼
        <input value={butlerName} aria-label="新总管称呼" onChange={event => setButlerName(event.target.value)} placeholder="例如：运维" />
      </label>
      <button type="button" className={styles.secondaryButton}
        disabled={busy || !butlerName.trim()}
        onClick={() => void run(async () => {
          const id = await createButler(butlerName.trim())
          setButlerName('')
          await startButler?.(id)
        })}>新安排一位总管</button>
      {error || voice.error ? <p role="alert">{error || voice.error}</p> : null}
      <label>查找已有任务<input value={query} onChange={event => setQuery(event.target.value)} placeholder="名称或项目目录" /></label>
      <div className={styles.launcherTasks}>
        {directory?.tasks.filter(task => `${task.title} ${task.cwd ?? ''}`.includes(query)).map(task =>
          <button type="button" key={task.taskId} disabled={!connected || busy || !!pendingTask}
            aria-pressed={voice.sessionId === task.taskId}
            onClick={() => void run(async () => { setPendingTask(task.taskId); await selectTask(task.taskId) })}>
            {task.running ? '执行中 · ' : ''}{task.title}
          </button>)}
        {directory?.tasks.length === 0 ? <p>暂无已有任务，可选择项目和 Agent 创建。</p> : null}
      </div>
      <label>项目<select value={workspace} onChange={event => setWorkspace(event.target.value)}>
        <option value="">选择项目</option>
        {directory?.projects.map(project => <option key={project.id} value={project.id}>{project.title} · {project.path}</option>)}
      </select></label>
      <label>Agent<select value={preset} onChange={event => setPreset(event.target.value)}>
        <option value="">选择 Agent</option>
        {directory?.agents.filter(agent => !agent.broken).map(agent => <option key={agent.id} value={agent.id}>{agent.name ?? agent.id}</option>)}
      </select></label>
      <button type="button" className={styles.secondaryButton} disabled={!connected || busy || !workspace || !preset}
        onClick={() => void run(() => createTask(workspace, preset))}>新建并选择任务</button>
    </section>}
  </aside>
}
