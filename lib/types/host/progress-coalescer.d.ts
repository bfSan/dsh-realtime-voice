export interface ProgressAnnouncementEntry {
    id: string;
    /** The literal text injected into the realtime session, tags included. */
    text: string;
    /** The speech payload without tags, used only for duplicate comparison. */
    body: string;
    /** Carried through untouched so each channel keeps its own event taxonomy. */
    kind: string;
}
export interface ProgressAnnouncementCoalescerOptions<T extends ProgressAnnouncementEntry> {
    /**
     * How long a stage update waits before it is safe to speak. DSH emits the
     * final answer as `assistant/message` and then repeats the identical text on
     * the immediately following `turn/end` (measured 2ms in session-806665a4),
     * so a short hold lets the terminal report supersede the redundant status.
     */
    holdMs: number;
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
    private clearTimer;
}
