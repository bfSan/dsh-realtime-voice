export interface ProgressAnnouncementEntry {
    id: string;
    /** The literal text injected into the realtime session, tags included. */
    text: string;
    /** The speech payload without tags, used only for duplicate comparison. */
    body: string;
    /** Carried through untouched so each channel keeps its own event taxonomy. */
    kind: string;
    /**
     * Identity of the work this entry reports on, normally one DSH turn.
     *
     * Duplicate suppression is scoped to a group on purpose: one paragraph must
     * not be spoken twice while one piece of work is in flight, but two separate
     * tasks that legitimately produce identical text must both be heard. An
     * entry without a group is never suppressed.
     */
    group?: string;
}
export interface ProgressAnnouncementCoalescerOptions<T extends ProgressAnnouncementEntry> {
    /**
     * How long a stage update waits before it is safe to speak. DSH emits the
     * final answer as `assistant/message` and then repeats the identical text on
     * the immediately following `turn/end` (measured 1-4ms in session-89bdc987),
     * so a short hold lets the terminal report supersede the redundant status.
     */
    holdMs: number;
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
    dedupeWindowMs?: number;
    emit: (entry: T) => void;
}
/**
 * Collapse a terminal report with the stage update that announced the same
 * text a moment earlier.
 *
 * Only the newest held update can be superseded: an older progress line that
 * was still waiting is flushed first so the spoken order stays truthful.
 */
export declare class ProgressAnnouncementCoalescer<T extends ProgressAnnouncementEntry> {
    private readonly options;
    private held;
    private timer;
    private disposed;
    /** Grouped bodies already handed to `emit`, oldest first, pruned by age. */
    private readonly spoken;
    constructor(options: ProgressAnnouncementCoalescerOptions<T>);
    /** Queue a stage update; it stays silent until the settle window expires. */
    offer(entry: T): void;
    /**
     * Forward an authoritative terminal report immediately. A held stage update
     * carrying the same speech payload is dropped rather than spoken twice.
     */
    settle(entry: T): void;
    /** Flush anything still held so disposal cannot silently swallow speech. */
    dispose(): void;
    private arm;
    private flushHeld;
    private emit;
    private alreadySpoken;
    private remember;
    private prune;
    private clearTimer;
}
