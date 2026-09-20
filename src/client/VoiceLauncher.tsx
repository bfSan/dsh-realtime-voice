import { useEffect, useState } from 'react'
import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { VoiceSnapshot } from './controller.ts'
import { VOICE_DIRECTORY_ROUTE } from '../supervisor-protocol.ts'
import styles from './voice.module.css'

export interface VoiceLauncherInjected {
  hooks: { voice: HostObservable<VoiceSnapshot> }
  startSupervisor(): Promise<void>
  selectTask(taskId: string): Promise<void>
  createTask(workspace: string, presetId: string): Promise<void>
}
type Props = PropsRuntime<'shell.overlay'> & InjectFace<VoiceLauncherInjected>
interface Directory {
  projects: { id: string; title: string; path: string }[]
  agents: { id: string; name?: string; broken?: unknown }[]
  tasks: { taskId: string; title: string; cwd?: string; running: boolean }[]
}

/** Always mounted: no current conversation is needed to place a call. */
export function VoiceLauncher({ useVoice, startSupervisor, selectTask, createTask }: Props) {
  const voice = useVoice(value => value)
  const [open, setOpen] = useState(false)
  const [directory, setDirectory] = useState<Directory>()
  const [error, setError] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [preset, setPreset] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingTask, setPendingTask] = useState('')
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
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (err) { setError(String(err)) } finally { setBusy(false) }
  }
  return <aside className={styles.launcher} aria-label="语音总管">
    <button type="button" className={styles.secondaryButton} aria-expanded={open} onClick={() => setOpen(!open)}>电话 · 语音总管</button>
    {!open ? null : <section className={styles.launcherMenu} aria-label="电话与执行对象">
      <strong>独立语音总管</strong>
      <p>先通话，再选择已有任务或指定项目和 Agent 创建任务。</p>
      <button type="button" className={styles.answerButton}
        disabled={busy || (voice.phase !== 'idle' && voice.phase !== 'error')}
        onClick={() => void run(startSupervisor)}>拨打电话</button>
      <p role="status">{pendingTask ? '正在选择任务…' : connected
        ? `当前对象：${directory?.tasks.find(task => task.taskId === voice.sessionId)?.title ?? (voice.sessionId === 'voice-supervisor' ? '尚未选择' : voice.sessionId)}`
        : `电话状态：${voice.phase}`}</p>
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
