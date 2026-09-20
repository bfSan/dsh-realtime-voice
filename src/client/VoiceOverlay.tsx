import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { realtimeVoiceModelLabel, realtimeVoiceTurnDetectionLabel } from '../models.ts'
import type { VoiceQuestionAnswer } from '../protocol.ts'
import type { VoiceInboxEntry } from '../protocol.ts'
import type { VoiceSnapshot } from './controller.ts'
import type { VoiceModelSettingsSnapshot } from './model-settings.ts'
import { playRingtone } from './ringtone.ts'
import {
  clampFloatingPosition,
  defaultFloatingPosition,
  moveFloatingPosition,
  type FloatingPosition,
} from './floating-position.ts'
import styles from './voice.module.css'

export interface VoiceOverlayInjected {
  hooks: {
    voice: HostObservable<VoiceSnapshot>
    /** Ring length comes from the Host setting so it stays one source of truth. */
    voiceModelSettings: HostObservable<VoiceModelSettingsSnapshot>
  }
  end: () => void
  toggleMute: () => void
  cancelResponse: () => void
  answerApproval: (approvalId: string, outcome: 'allowed-once' | 'rejected') => void
  answerQuestion: (requestId: string, answers: VoiceQuestionAnswer[]) => void
  answerInbox: (sessionId?: string) => void
  answerInboxOne: (entryId: string) => void
  snoozeInbox: (entryId: string) => void
  toggleInboxSelection: (entryId: string) => void
  selectAllInbox: () => void
  clearInboxSelection: () => void
  dismissInbox: (entryIds: string[]) => void
  openSession: (sessionId: string) => void
}
export type VoiceOverlayProps = PropsRuntime<'shell.overlay'> & InjectFace<VoiceOverlayInjected>

interface DragState {
  pointerId: number
  pointerStart: FloatingPosition
  origin: FloatingPosition
}

/**
 * The floating panel is a drag surface, so anything focusable or scrollable
 * inside it must be excluded from the drag gesture. Exempting only `button`
 * left checkboxes, links and selects dead: the drag handler cancels their
 * default behavior and captures the pointer before they can react.
 */
const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a[href], [role="button"], [role="checkbox"]'

/** Root-level movable call surface that remains visible while the user changes DSH sessions. */
export function VoiceOverlay({
  useVoice,
  useVoiceModelSettings,
  useSessions,
  end,
  toggleMute,
  cancelResponse,
  answerApproval,
  answerQuestion,
  answerInbox,
  answerInboxOne,
  snoozeInbox,
  toggleInboxSelection,
  selectAllInbox,
  clearInboxSelection,
  dismissInbox,
  openSession,
}: VoiceOverlayProps) {
  const voice = useVoice(snapshot => snapshot)
  const ringDurationMs = useVoiceModelSettings(snapshot => snapshot.ringDurationMs)
  const [collapsed, setCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<FloatingPosition>()
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<DragState>()
  const movedRef = useRef(false)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, { selected: string[]; custom: string }>>({})
  const boundSession = useSessions(state => voice.sessionId === undefined
    ? undefined
    : state.byId[voice.sessionId as SessionId])
  const currentSessionId = useSessions(state => state.current)
  const viewingOtherSession = voice.sessionId !== undefined && currentSessionId !== voice.sessionId
  // A snapshot from an older Host has no inbox field; treat it as empty.
  const waiting = (voice.inbox ?? []).filter(entry => !entry.delivered)
  const snoozed = voice.snoozedInbox ?? []
  const rungRef = useRef<Set<string>>(new Set())
  // The bell is owned imperatively: React re-renders every two seconds (the
  // presence poll), so an effect cleanup would tear the ring down within one
  // poll and the configured length would never be heard.
  const ringRef = useRef<{ stop: () => void; timer: ReturnType<typeof setTimeout> }>()
  const stopRing = useCallback(() => {
    const ringing = ringRef.current
    if (ringing === undefined) return
    ringRef.current = undefined
    clearTimeout(ringing.timer)
    ringing.stop()
  }, [])
  // Keyed on ids rather than array identity for the same reason: each poll
  // hands back a brand new array of the same reports.
  const waitingKey = waiting.map(entry => entry.id).join(',')
  const snoozedKey = snoozed.join(',')

  useEffect(() => {
    if (voice.phase !== 'idle') {
      stopRing()
      return
    }
    // A snoozed report stays listed but must not ring again, so it counts as
    // already offered.
    const fresh = waiting.filter(entry => !rungRef.current.has(entry.id) && !snoozed.includes(entry.id))
    if (fresh.length === 0) return
    for (const entry of fresh) rungRef.current.add(entry.id)
    // A bell already ringing for an earlier report is left to finish; restarting
    // it on every new arrival would cut the configured length short again.
    if (ringRef.current !== undefined) return
    const stop = playRingtone(ringDurationMs)
    if (stop === undefined) return
    // When the bell stops, the call falls back to "稍后"; the task stays in
    // the list either way, so a missed ring never loses a report.
    const timer = setTimeout(() => {
      ringRef.current = undefined
      stop()
    }, ringDurationMs)
    ringRef.current = { stop, timer }
    // Only the arrival of a new report may ring: dismissing one row, or
    // finishing a call, must not restart the bell for rows already offered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingKey, snoozedKey, voice.phase, ringDurationMs, stopRing])

  // Unmounting the call surface must not leave an oscillator running.
  useEffect(() => stopRing, [stopRing])

  // "稍后" is the explicit "stop ringing at me" gesture, so it silences the
  // bell immediately instead of waiting out the configured length.
  useEffect(() => {
    if (snoozedKey !== '') stopRing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snoozedKey, stopRing])

  useEffect(() => {
    if (voice.phase === 'requesting-permission') setCollapsed(false)
  }, [voice.phase])

  useEffect(() => {
    setQuestionAnswers({})
  }, [voice.pendingQuestion?.requestId])

  useEffect(() => {
    const panel = panelRef.current
    if (panel === null || voice.phase === 'idle') return
    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect()
        const viewport = { width: window.innerWidth, height: window.innerHeight }
        const size = { width: rect.width, height: rect.height }
        setPosition(current => current === undefined
          ? defaultFloatingPosition(viewport, size)
          : clampFloatingPosition(current, viewport, size))
      })
    }
    fit()
    window.addEventListener('resize', fit)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit)
    observer?.observe(panel)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', fit)
      observer?.disconnect()
    }
  }, [collapsed, voice.phase])

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, allowFromControl = false) => {
    if (event.button !== 0 || panelRef.current === null) return
    // Any interactive control owns its own pointer: `preventDefault()` below
    // cancels the default action and `setPointerCapture` then steals the
    // gesture, which silently ate every button in the call-back list. Only the
    // collapsed orb keeps dragging from its own button, because the orb has no
    // other grab surface.
    if (!allowFromControl && (event.target as Element).closest(INTERACTIVE_SELECTOR) !== null) return
    const rect = panelRef.current.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      pointerStart: { x: event.clientX, y: event.clientY },
      origin: { x: rect.left, y: rect.top },
    }
    movedRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    const panel = panelRef.current
    if (drag === undefined || drag.pointerId !== event.pointerId || panel === null) return
    if (Math.abs(event.clientX - drag.pointerStart.x) + Math.abs(event.clientY - drag.pointerStart.y) > 4) {
      movedRef.current = true
    }
    const rect = panel.getBoundingClientRect()
    setPosition(moveFloatingPosition(
      drag.origin,
      drag.pointerStart,
      { x: event.clientX, y: event.clientY },
      { width: window.innerWidth, height: window.innerHeight },
      { width: rect.width, height: rect.height },
    ))
  }

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = undefined
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // The call surface stays mounted while it is idle only to offer pending
  // reports; otherwise a finished background task would have nowhere to ring.
  if (voice.phase === 'idle' && waiting.length === 0) return null
  const floatingStyle: CSSProperties | undefined = position === undefined
    ? undefined
    : { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }

  if (voice.phase === 'idle') {
    return (
      <section
        ref={panelRef}
        className={`${styles.overlay} ${styles.overlayIncoming} ${dragging ? styles.dragging : ''}`}
        style={floatingStyle}
        aria-label="待接听的语音汇报"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <CallBackList
          waiting={waiting}
          selection={voice.inboxSelection}
          onToggle={toggleInboxSelection}
          onSelectAll={selectAllInbox}
          onClearSelection={clearInboxSelection}
          onDismiss={dismissInbox}
          onAnswer={() => answerInbox()}
          onAnswerOne={answerInboxOne}
          onSnooze={snoozeInbox}
        />
      </section>
    )
  }

  if (collapsed && voice.phase !== 'error') {
    return (
      <section
        ref={panelRef}
        className={`${styles.voiceOrb} ${dragging ? styles.dragging : ''}`}
        style={floatingStyle}
        data-phase={voice.phase}
        aria-label={`实时语音：${phaseText(voice.phase)}`}
        onPointerDown={event => beginDrag(event, true)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          type="button"
          className={styles.orbButton}
          aria-label="展开实时语音"
          title="拖动悬浮球；点击展开"
          onClick={() => {
            if (movedRef.current) {
              movedRef.current = false
              return
            }
            setCollapsed(false)
          }}
        >
          <span className={styles.orbWaves} aria-hidden><i /><i /><i /><i /><i /></span>
          <span className={styles.orbTime}>{formatElapsed(voice.elapsedSeconds)}</span>
        </button>
      </section>
    )
  }

  return (
    <section
      ref={panelRef}
      className={`${styles.overlay} ${voice.phase === 'error' ? styles.overlayError : ''} ${dragging ? styles.dragging : ''}`}
      style={floatingStyle}
      aria-label="实时语音通话"
    >
      <header
        className={`${styles.overlayHeader} ${styles.dragHandle}`}
        title="拖动语音窗口"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div>
          <div className={styles.eyebrow}>DSH 实时语音</div>
          <div className={styles.phaseLine}>
            <span className={styles.liveDot} />
            {phaseText(voice.phase)} · {formatElapsed(voice.elapsedSeconds)}
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.agentState}>{voice.agentRunning ? 'Agent 工作中' : 'Agent 待命'}</div>
          {voice.phase === 'error' ? null : (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="收起为悬浮球"
              title="收起为悬浮球"
              onClick={() => setCollapsed(true)}
            >−</button>
          )}
        </div>
      </header>
      {voice.phase === 'error' ? (
        <>
          <div className={styles.errorText}>{voice.error}</div>
          <button type="button" className={styles.secondaryButton} onClick={() => void end()}>关闭</button>
        </>
      ) : (
        <>
          <div className={styles.bindingCard}>
            <div className={styles.bindingLabel}>本次通话一对一绑定</div>
            <div className={styles.bindingTitle}>{boundSession?.displayTitle ?? '当前 DSH 会话'}</div>
            <div className={styles.bindingMeta}>
              {boundSession?.blank === true ? '空白新会话 · 首个 Agent 指令会写入第一轮' : '工作指令与 Agent 结果保存在此线程'}
              {' · '}{realtimeVoiceModelLabel(voice.providerModel)}
              {' · '}{realtimeVoiceTurnDetectionLabel(voice.turnDetection)}
            </div>
            {viewingOtherSession ? (
              <button type="button" className={styles.returnLink} onClick={() => openSession(voice.sessionId!)}>
                当前正在查看其他线程，返回绑定线程
              </button>
            ) : null}
          </div>
          <div className={styles.transcripts}>
            <div className={styles.transcriptBlock}>
              <span className={styles.speakerLabel}>你</span>
              <p className={styles.userText}>{voice.userTranscript || '正在聆听…'}</p>
            </div>
            <div className={styles.transcriptBlock}>
              <span className={styles.speakerLabel}>语音 Agent</span>
              <p className={styles.assistantText}>{voice.assistantTranscript || '你可以直接交代任务、追问进度或随时纠正方向。'}</p>
            </div>
          </div>
          {voice.agentSummary === undefined ? null : (
            <div className={styles.agentSummary}><strong>DSH Agent 最新结果</strong>{voice.agentSummary}</div>
          )}
          {voice.pendingApproval === undefined ? null : (
            <section className={styles.interactionCard} aria-label="DSH 操作审批">
              <strong>需要你的批准</strong>
              <div className={styles.interactionTitle}>{voice.pendingApproval.toolName}</div>
              {voice.pendingApproval.reason === undefined ? null : (
                <p className={styles.interactionDetail}>{voice.pendingApproval.reason}</p>
              )}
              <div className={styles.interactionActions}>
                <button
                  type="button"
                  className={styles.rejectButton}
                  onClick={() => answerApproval(voice.pendingApproval!.approvalId, 'rejected')}
                >拒绝</button>
                <button
                  type="button"
                  className={styles.allowButton}
                  onClick={() => answerApproval(voice.pendingApproval!.approvalId, 'allowed-once')}
                >仅允许这一次</button>
              </div>
            </section>
          )}
          {voice.pendingQuestion === undefined ? null : (
            <section className={styles.interactionCard} aria-label="DSH Agent 追问">
              <strong>Agent 需要你确认</strong>
              {voice.pendingQuestion.questions.map((question) => {
                const current = questionAnswers[question.id] ?? { selected: [], custom: '' }
                return (
                  <div className={styles.questionBlock} key={question.id}>
                    <div className={styles.interactionTitle}>{question.header ?? question.question}</div>
                    {question.header === undefined ? null : <p className={styles.interactionDetail}>{question.question}</p>}
                    {question.detail === undefined ? null : <p className={styles.interactionDetail}>{question.detail}</p>}
                    {question.options?.map(option => {
                      const checked = current.selected.includes(option.label)
                      return (
                        <label className={styles.questionOption} key={option.label}>
                          <input
                            type={question.multiSelect === true ? 'checkbox' : 'radio'}
                            name={`${voice.pendingQuestion!.requestId}:${question.id}`}
                            checked={checked}
                            onChange={() => setQuestionAnswers(previous => ({
                              ...previous,
                              [question.id]: {
                                ...current,
                                selected: question.multiSelect === true
                                  ? checked
                                    ? current.selected.filter(value => value !== option.label)
                                    : [...current.selected, option.label]
                                  : [option.label],
                              },
                            }))}
                          />
                          <span>{option.label}{option.description === undefined ? '' : ` — ${option.description}`}</span>
                        </label>
                      )
                    })}
                    <input
                      className={styles.questionCustom}
                      value={current.custom}
                      placeholder={question.options === undefined ? '输入回答' : '其他补充（可选）'}
                      onChange={event => setQuestionAnswers(previous => ({
                        ...previous,
                        [question.id]: { ...current, custom: event.target.value },
                      }))}
                    />
                  </div>
                )
              })}
              <div className={styles.interactionActions}>
                <button
                  type="button"
                  className={styles.allowButton}
                  onClick={() => {
                    const answers = voice.pendingQuestion!.questions.map(question => {
                      const answer = questionAnswers[question.id] ?? { selected: [], custom: '' }
                      return {
                        id: question.id,
                        selected: answer.selected,
                        ...(answer.custom.trim() === '' ? {} : { custom: answer.custom.trim() }),
                      }
                    }).filter(answer => answer.selected.length > 0 || answer.custom !== undefined)
                    answerQuestion(voice.pendingQuestion!.requestId, answers)
                  }}
                >提交回答</button>
              </div>
            </section>
          )}
          {voice.error === undefined ? null : <div className={styles.inlineError}>{voice.error}</div>}
          {waiting.length === 0 ? null : (
            <div className={styles.incomingNotice}>
              还有 {waiting.length} 个后台任务已完成，结束后可接听汇报。
            </div>
          )}
          <footer className={styles.controls}>
            <button type="button" className={styles.secondaryButton} onClick={toggleMute}>
              {voice.muted ? '取消静音' : '静音'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={cancelResponse}>立即打断</button>
            {voice.sessionId === undefined || !viewingOtherSession ? null : (
              <button type="button" className={styles.secondaryButton} onClick={() => openSession(voice.sessionId!)}>返回任务</button>
            )}
            <button type="button" className={styles.endButton} onClick={() => void end()}>结束</button>
          </footer>
        </>
      )}
    </section>
  )
}

function CallBackList(props: {
  waiting: readonly VoiceInboxEntry[]
  selection: readonly string[]
  onToggle: (entryId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDismiss: (entryIds: string[]) => void
  onAnswer: () => void
  /** Take one task's report straight away, without touching the selection. */
  onAnswerOne: (entryId: string) => void
  /** Stop the ring for this report but keep it in the list. */
  onSnooze: (entryId: string) => void
}) {
  const allSelected = props.selection.length === props.waiting.length && props.waiting.length > 0
  return (
    <>
      <header className={styles.incomingHeader}>
        <div>
          <div className={styles.eyebrow}>DSH 实时语音</div>
          <div className={styles.phaseLine}>
            <span className={styles.ringDot} />
            {pendingCount(props.waiting) === 0
              ? `${props.waiting.length} 个任务已完成，等待汇报`
              : `${pendingCount(props.waiting)} 个问题等你回答${
                props.waiting.length - pendingCount(props.waiting) === 0
                  ? ''
                  : `，另有 ${props.waiting.length - pendingCount(props.waiting)} 个任务可汇报`
              }`}
          </div>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="清空选择"
          title="清空选择"
          onClick={props.onClearSelection}
        >×</button>
      </header>
      <ul className={styles.incomingList}>
        {props.waiting.map((entry) => {
          const checked = props.selection.includes(entry.id)
          return (
            <li className={styles.incomingRow} key={entry.id}>
              <div className={styles.incomingLabel}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`选中「${entry.sessionTitle ?? entry.request.slice(0, 40)}」`}
                  className={`${styles.rowCheck} ${checked ? styles.rowCheckOn : ''}`}
                  onClick={() => props.onToggle(entry.id)}
                >{checked ? '✓' : ''}</button>
                <span className={styles.incomingTitle}>{entry.sessionTitle ?? entry.request.slice(0, 40)}</span>
              </div>
              <div className={styles.incomingMeta}>
                <span className={styles.incomingStatus} data-status={entry.status}>{inboxStatusText(entry.status)}</span>
                <span>{entry.sessionTitle === undefined ? entry.request.slice(0, 60) : entry.request.slice(0, 40)}</span>
              </div>
              <div className={styles.incomingActions}>
                <span className={styles.incomingTime}>{inboxAgeText(entry.createdAt)} · {inboxDurationText(entry.durationMs)}</span>
                <button
                  type="button"
                  className={styles.rowAnswer}
                  onClick={() => props.onAnswerOne(entry.id)}
                >{entry.kind === 'needs-input' ? '回答' : '接听'}</button>
                <button type="button" className={styles.rowAction} onClick={() => props.onDismiss([entry.id])}>已读</button>
                <button type="button" className={styles.rowAction} onClick={() => props.onSnooze(entry.id)}>稍后</button>
              </div>
            </li>
          )
        })}
      </ul>
      <footer className={styles.incomingFooter}>
        <button type="button" className={styles.secondaryButton} onClick={props.onSelectAll}>
          {allSelected ? '全不选' : '全选'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => props.onDismiss(props.waiting.map(entry => entry.id))}
        >全部已读</button>
        <button
          type="button"
          className={styles.answerButton}
          disabled={props.waiting.length === 0}
          onClick={props.onAnswer}
        >
          {props.selection.length > 1 ? `接听并汇报 ${props.selection.length} 条` : '接听'}
        </button>
        <div className={styles.incomingHint}>
          点「稍后」只是收起当前选择，任务会留在列表里。响铃时长可在插件设置里调整。
        </div>
      </footer>
    </>
  )
}

function inboxStatusText(status: VoiceInboxEntry['status']): string {
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'
  if (status === 'needs-input') return '等待你回答'
  return '失败'
}

function inboxAgeText(createdAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - createdAt) / 1_000))
  if (seconds < 60) return `${seconds} 秒前`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  return `${Math.round(minutes / 60)} 小时前`
}

function inboxDurationText(durationMs: number): string {
  const seconds = Math.round(durationMs / 1_000)
  if (seconds < 60) return `耗时 ${seconds} 秒`
  return `耗时 ${Math.round(seconds / 60)} 分钟`
}

/** How many listed entries are blocked on the user rather than reporting a result. */
function pendingCount(entries: readonly VoiceInboxEntry[]): number {
  return entries.filter(entry => entry.kind === 'needs-input').length
}

function phaseText(phase: VoiceSnapshot['phase']): string {
  switch (phase) {
    case 'requesting-permission': return '请求麦克风'
    case 'connecting': return '正在接通'
    case 'listening': return '正在聆听'
    case 'thinking': return '正在思考'
    case 'agent-working': return '正在操作 DSH'
    case 'speaking': return '正在回答'
    case 'reconnecting': return '正在重连'
    case 'ending': return '正在结束'
    case 'idle': return '待机'
    case 'error': return '出错'
  }
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}
