import {
  REALTIME_VOICE_PROGRESS_REPORTING,
  type RealtimeVoiceProgressReporting,
} from '../models.ts'

export interface ProgressAnnouncementPolicy {
  mode: RealtimeVoiceProgressReporting
  /** Minimum spacing between two progress announcements inside one DSH turn. */
  minIntervalMs: number
  /** How long a task must run before any progress is worth speaking at all. */
  quietTaskMs: number
}

/**
 * Decide whether one DSH stage update is worth injecting into the live voice
 * session. Terminal results, approvals, questions and failures never pass
 * through this gate; only the high-volume `assistant/message` stream does.
 *
 * The gate is deliberately state-free from the caller's point of view: it
 * coalesces a burst of stage updates into a single announcement that carries
 * the newest text, instead of replaying a backlog out of order.
 */
export class ProgressAnnouncementGate {
  private turnStartedAt: number | undefined
  private lastAnnouncedAt: number | undefined

  constructor(private policy: ProgressAnnouncementPolicy) {}

  /** A new DSH turn earns a fresh quiet window and interval budget. */
  markTurnStarted(now = Date.now()): void {
    this.turnStartedAt = now
    this.lastAnnouncedAt = undefined
  }

  markTurnEnded(): void {
    this.turnStartedAt = undefined
    this.lastAnnouncedAt = undefined
  }

  /** Return true when this stage update should become a spoken progress line. */
  decide(now = Date.now()): boolean {
    if (this.policy.mode === REALTIME_VOICE_PROGRESS_REPORTING.all) return true
    if (this.policy.mode === REALTIME_VOICE_PROGRESS_REPORTING.silent) return false
    // A missed turn/start (reconnect, late subscription) must still get the
    // same quiet window instead of speaking the first stage update instantly.
    this.turnStartedAt ??= now
    if (now - this.turnStartedAt < this.policy.quietTaskMs) return false
    if (this.lastAnnouncedAt !== undefined && now - this.lastAnnouncedAt < this.policy.minIntervalMs) return false
    this.lastAnnouncedAt = now
    return true
  }
}
