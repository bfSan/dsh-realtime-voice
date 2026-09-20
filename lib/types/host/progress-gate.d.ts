import { type RealtimeVoiceProgressReporting } from '../models.ts';
export interface ProgressAnnouncementPolicy {
    mode: RealtimeVoiceProgressReporting;
    /** Minimum spacing between two progress announcements inside one DSH turn. */
    minIntervalMs: number;
    /** How long a task must run before any progress is worth speaking at all. */
    quietTaskMs: number;
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
export declare class ProgressAnnouncementGate {
    private policy;
    private turnStartedAt;
    private lastAnnouncedAt;
    constructor(policy: ProgressAnnouncementPolicy);
    /** A new DSH turn earns a fresh quiet window and interval budget. */
    markTurnStarted(now?: number): void;
    markTurnEnded(): void;
    /** Return true when this stage update should become a spoken progress line. */
    decide(now?: number): boolean;
}
