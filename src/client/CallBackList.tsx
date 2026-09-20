import { useState } from 'react'
import type { VoiceInboxEntry } from '../protocol.ts'
import styles from './voice.module.css'

export function CallBackList(props: {
  waiting: readonly VoiceInboxEntry[]
  snoozed: readonly string[]
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
  const [confirmIds, setConfirmIds] = useState<string[]>([])
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
      {confirmIds.length === 0 ? null : (
        <div role="alertdialog" aria-label="确认标记已读" className={styles.readConfirmation}>
          <p>将 {confirmIds.length} 条记录标记已读？仅从待汇报列表移除，DSH 会话不会删除。</p>
          {props.waiting.some(entry => confirmIds.includes(entry.id) && entry.kind === 'needs-input')
            ? <p>待回答的问题将交还 DSH 文字界面，不代表同意或拒绝。</p> : null}
          <button type="button" className={styles.secondaryButton} onClick={() => setConfirmIds([])}>取消</button>
          <button type="button" className={styles.secondaryButton} onClick={() => {
            props.onDismiss(confirmIds)
            setConfirmIds([])
          }}>确认已读</button>
        </div>
      )}
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
                <span className={styles.incomingStatus} data-status={entry.status}>{props.snoozed.includes(entry.id) ? '已稍后' : inboxStatusText(entry.status)}</span>
                <span>{entry.sessionTitle === undefined ? entry.request.slice(0, 60) : entry.request.slice(0, 40)}</span>
              </div>
              <div className={styles.incomingActions}>
                <span className={styles.incomingTime}>{inboxAgeText(entry.createdAt)} · {inboxDurationText(entry.durationMs)}</span>
                <button
                  type="button"
                  className={styles.rowAnswer}
                  onClick={() => props.onAnswerOne(entry.id)}
                >{entry.requiresOriginalSession ? '原任务待答' : entry.kind === 'needs-input' ? '回答' : '接听'}</button>
                <button type="button" className={styles.rowAction} onClick={() => setConfirmIds([entry.id])}>已读</button>
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
          onClick={() => setConfirmIds(props.waiting.map(entry => entry.id))}
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
