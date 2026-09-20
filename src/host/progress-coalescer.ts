export interface ProgressAnnouncementEntry {
  id: string
  /** The literal text injected into the realtime session, tags included. */
  text: string
  /** The speech payload without tags, used only for duplicate comparison. */
  body: string
  /** Carried through untouched so each channel keeps its own event taxonomy. */
  kind: string
  /**
   * Identity of the work this entry reports on, normally one DSH turn.
   *
   * Duplicate suppression is scoped to a group on purpose: one paragraph must
   * not be spoken twice while one piece of work is in flight, but two separate
   * tasks that legitimately produce identical text must both be heard. An
   * entry without a group is never suppressed.
   */
  group?: string
}

export interface ProgressAnnouncementCoalescerOptions<T extends ProgressAnnouncementEntry> {
  /**
   * How long a stage update waits before it is safe to speak. DSH emits the
   * final answer as `assistant/message` and then repeats the identical text on
   * the immediately following `turn/end` (measured 1-4ms in session-89bdc987),
   * so a short hold lets the terminal report supersede the redundant status.
   */
  holdMs: number
  /**
   * How long an already-spoken body stays suppressed inside its own group.
   *
   * The hold window only covers a *queued* update. Once the hold releases an
   * update, the terminal report that follows can no longer pop it, and the
   * paragraph is spoken twice: the same text crosses both the stage-update
   * channel and the `turn/end` channel, and the realtime provider's own queue
   * can delay the first one well past the hold. A content window closes that
   * gap without touching a different turn's identical report.
   */
  dedupeWindowMs?: number
  emit: (entry: T) => void
}

/** Long enough to cover one turn's channel crossing, short enough to forget. */
const DEFAULT_DEDUPE_WINDOW_MS = 180_000
/** Bounded memory: only recent bodies can still suppress anything. */
const MAX_SPOKEN_HISTORY = 64

/**
 * Collapse a terminal report with the stage update that announced the same
 * text a moment earlier.
 *
 * Only the newest held update can be superseded: an older progress line that
 * was still waiting is flushed first so the spoken order stays truthful.
 */
export class ProgressAnnouncementCoalescer<T extends ProgressAnnouncementEntry> {
  private readonly options: ProgressAnnouncementCoalescerOptions<T>
  private held: T[] = []
  private timer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  /** Grouped bodies already handed to `emit`, oldest first, pruned by age. */
  private readonly spoken: { group: string; body: string; at: number }[] = []

  constructor(options: ProgressAnnouncementCoalescerOptions<T>) {
    this.options = { dedupeWindowMs: DEFAULT_DEDUPE_WINDOW_MS, ...options }
  }

  /** Queue a stage update; it stays silent until the settle window expires. */
  offer(entry: T): void {
    if (this.disposed || this.alreadySpoken(entry)) return
    this.held.push(entry)
    this.arm()
  }

  /**
   * Forward an authoritative terminal report immediately. A held stage update
   * carrying the same speech payload is dropped rather than spoken twice.
   */
  settle(entry: T): void {
    // Read the suppression state before the held pop below rewrites it.
    const alreadySpoken = this.alreadySpoken(entry)
    if (this.disposed) {
      if (!alreadySpoken) this.emit(entry)
      return
    }
    const last = this.held.at(-1)
    if (last !== undefined && normalize(last.body) === normalize(entry.body)) {
      this.held.pop()
    }
    this.flushHeld()
    // A stage update the hold already released cannot be popped, so the
    // content window is the only thing standing between it and a repeat.
    if (!alreadySpoken) this.emit(entry)
  }

  /** Flush anything still held so disposal cannot silently swallow speech. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.clearTimer()
    this.flushHeld()
  }

  private arm(): void {
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flushHeld()
    }, this.options.holdMs)
    // A held announcement must never keep the DSH host process alive.
    this.timer.unref?.()
  }

  private flushHeld(): void {
    if (this.held.length === 0) return
    const pending = this.held
    this.held = []
    this.clearTimer()
    for (const entry of pending) {
      // Held entries can collide with one another, not just with the report
      // that released them.
      if (this.alreadySpoken(entry)) continue
      this.emit(entry)
    }
  }

  private emit(entry: T): void {
    this.remember(entry)
    this.options.emit(entry)
  }

  private alreadySpoken(entry: T): boolean {
    const group = entry.group
    if (group === undefined || group === '') return false
    const body = normalize(entry.body)
    if (body === '') return false
    this.prune()
    return this.spoken.some(recent => recent.group === group && recent.body === body)
  }

  private remember(entry: T): void {
    const group = entry.group
    if (group === undefined || group === '') return
    const body = normalize(entry.body)
    if (body === '') return
    this.spoken.push({ group, body, at: Date.now() })
    while (this.spoken.length > MAX_SPOKEN_HISTORY) this.spoken.shift()
  }

  private prune(): void {
    const cutoff = Date.now() - (this.options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS)
    while (this.spoken.length > 0 && (this.spoken[0] as { at: number }).at < cutoff) this.spoken.shift()
  }

  private clearTimer(): void {
    if (this.timer === undefined) return
    clearTimeout(this.timer)
    this.timer = undefined
  }
}

function normalize(body: string): string {
  return body.replace(/\s+/g, '')
}
