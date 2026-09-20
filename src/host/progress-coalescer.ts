export interface ProgressAnnouncementEntry {
  id: string
  /** The literal text injected into the realtime session, tags included. */
  text: string
  /** The speech payload without tags, used only for duplicate comparison. */
  body: string
  /** Carried through untouched so each channel keeps its own event taxonomy. */
  kind: string
}

export interface ProgressAnnouncementCoalescerOptions<T extends ProgressAnnouncementEntry> {
  /**
   * How long a stage update waits before it is safe to speak. DSH emits the
   * final answer as `assistant/message` and then repeats the identical text on
   * the immediately following `turn/end` (measured 2ms in session-806665a4),
   * so a short hold lets the terminal report supersede the redundant status.
   */
  holdMs: number
  emit: (entry: T) => void
}

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

  constructor(options: ProgressAnnouncementCoalescerOptions<T>) {
    this.options = options
  }

  /** Queue a stage update; it stays silent until the settle window expires. */
  offer(entry: T): void {
    if (this.disposed) return
    this.held.push(entry)
    this.arm()
  }

  /**
   * Forward an authoritative terminal report immediately. A held stage update
   * carrying the same speech payload is dropped rather than spoken twice.
   */
  settle(entry: T): void {
    if (this.disposed) {
      this.options.emit(entry)
      return
    }
    const last = this.held.at(-1)
    if (last !== undefined && normalize(last.body) === normalize(entry.body)) {
      this.held.pop()
    }
    this.flushHeld()
    this.options.emit(entry)
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
    for (const entry of pending) this.options.emit(entry)
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
