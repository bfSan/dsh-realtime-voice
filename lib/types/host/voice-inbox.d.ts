import type { Context } from '@deepseek-ai/cordis';
import { type LegacyStreamFrame } from './dsh-runtime-compat.ts';
import type { PendingVoiceApproval, PendingVoiceQuestion } from './dsh-coordinator.ts';
export declare const MAX_INBOX_ENTRIES = 20;
/** One spoken report cannot carry an unbounded summary. */
export declare const MAX_INBOX_SUMMARY_LENGTH = 1200;
export type VoiceInboxStatus = 'completed' | 'failed' | 'cancelled';
export interface VoiceInboxEntry {
    id: string;
    handoffId: string;
    sessionId: string;
    sessionTitle?: string;
    /** The delegated instruction, as the user's agent received it. */
    request: string;
    /** Final assistant text, already trimmed for speech. */
    summary: string;
    status: VoiceInboxStatus | 'needs-input';
    /** `needs-input` entries ask a question; everything else reports a result. */
    kind?: 'report' | 'needs-input';
    /** DSH correlation id of the pending interaction, for `needs-input`. */
    interactionId?: string;
    createdAt: number;
    /** How long the delegated turn ran, used to skip ringing for short tasks. */
    durationMs: number;
    /** True once the voice surface has spoken this report. */
    delivered: boolean;
}
export interface WatchHandoffInput {
    handoffId: string;
    sessionId: string;
    request: string;
    sessionTitle?: string;
}
/**
 * Host-only payload behind one `needs-input` entry.
 *
 * Kept out of the wire entry on purpose: the browser needs the prompt and the
 * correlation id, not the full DSH question shape. Only the host re-registers
 * the interaction after a hang-up, and only the host resolves it.
 */
export type VoicePendingInteraction = {
    kind: 'approval';
    sessionId: string;
    approval: PendingVoiceApproval;
    prompt: string;
} | {
    kind: 'question';
    sessionId: string;
    question: PendingVoiceQuestion;
    prompt: string;
};
export interface VoiceInboxSource {
    mux(request: {
        rpcId: string;
        payload: unknown;
    }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>;
}
/**
 * Bounded, in-memory call-back queue.
 *
 * Nothing here is a durable record: DSH still owns the authoritative
 * transcript, and the entry only exists so the voice surface can offer
 * "N 条任务已完成，要不要现在听汇报".
 */
export declare class VoiceInbox {
    private readonly entries;
    private readonly watched;
    private readonly pendingAssistant;
    /** Full interaction payloads behind the `needs-input` entries. */
    private readonly pending;
    /**
     * Interactions a live call already owns.
     *
     * The live surface asks these out loud itself, so ringing the user back
     * about a question they are being asked right now would just be noise. The
     * live call and the inbox read the same frame from two independent streams,
     * so suppression must survive whichever order they arrive in.
     */
    private isLiveCall;
    /**
     * Interactions observed while a live call owned their session.
     *
     * They are not dropped, only deferred: if the user hangs up without
     * answering, the Agent is still blocked and the voice surface is the only
     * place that can reach them. Keeping the exact entry means the ring-back
     * they get is the one they would have got had they never called at all.
     */
    private readonly deferred;
    /** Gives a dismissed pending interaction back to the browser answerer. */
    private delegateInteraction;
    /** Handoffs the live call already spoke, seen before or after their entry. */
    private readonly spokenHandoffs;
    private titleLookup;
    watch(input: WatchHandoffInput): void;
    /**
     * Whether this session currently holds a handoff the voice surface started.
     *
     * This is the predicate that must survive a hang-up: the handoff outlives
     * the call, so "the user hung up" must not stop the Agent's question from
     * being routed to the voice surface.
     */
    watchesSession(sessionId: string): boolean;
    /**
     * Teach the inbox which sessions currently have a live voice call.
     *
     * A live call speaks its approvals and questions itself, so those must not
     * also appear in the ring-back list. Once the call ends the same pending
     * interaction becomes exactly what the user needs to be called about.
     */
    setIsLiveCall(isLiveCall: (sessionId: string) => boolean): void;
    /** Wire the exit hatch used when a pending interaction is dismissed. */
    setDelegateInteraction(delegate: (interactionId: string) => void): void;
    /**
     * Record that a watched handoff is blocked on the user.
     *
     * A pending approval or question is not a terminal state, so it never
     * reaches {@link completeTurn}. Without this the Agent would wait forever on
     * a decision the user cannot see, which is exactly the case for a task the
     * voice surface delegated and then stopped calling about.
     *
     * @returns the entry, or undefined when this interaction is already listed.
     */
    observeNeedsInput(input: {
        sessionId: string;
        interactionId: string;
        /** The prompt to speak, already formatted for the realtime model. */
        prompt: string;
        request: string;
        sessionTitle?: string;
    }, interaction?: VoicePendingInteraction): VoiceInboxEntry | undefined;
    /**
     * List the interactions a live call deferred but never answered.
     *
     * Called when the call surface changes: every deferred interaction whose
     * session no longer owns a call is the same ring-back the user would have
     * received had they never picked up.
     *
     * @returns the entries that just became visible, oldest first.
     */
    releaseDeferred(): VoiceInboxEntry[];
    /**
     * Drop a pending entry once the interaction is answered or goes away.
     *
     * @returns the removed entry, or undefined when it was not listed.
     */
    resolveNeedsInput(interactionId: string): VoiceInboxEntry | undefined;
    /** The full pending interaction behind one `needs-input` entry. */
    pendingInteraction(interactionId: string): VoicePendingInteraction | undefined;
    /** Pending interactions for one session, oldest first. */
    pendingForSession(sessionId: string): VoicePendingInteraction[];
    /** Titles are resolved lazily so a slow session list never blocks a call. */
    setTitleLookup(lookup: (sessionId: string) => Promise<string | undefined>): void;
    list(): VoiceInboxEntry[];
    /** Entries the voice surface still owes the user. */
    undelivered(): VoiceInboxEntry[];
    markDelivered(ids: readonly string[]): VoiceInboxEntry[];
    /**
     * Mark the entry for one handoff as already reported. Used when the task
     * finished while the user was still on the call: the live surface spoke the
     * result, so ringing them back about it would repeat the same news.
     */
    markHandoffDelivered(handoffId: string): VoiceInboxEntry | undefined;
    dismiss(ids: readonly string[]): number;
    clear(): void;
    /**
     * Fold one mux frame into the queue.
     *
     * @returns the entry this frame completed, if any.
     */
    observe(frame: LegacyStreamFrame): VoiceInboxEntry | undefined;
    private completeTurn;
    /** One handoff per session at a time; a second watch replaces the first. */
    private newestWatch;
}
export interface StartVoiceInboxOptions {
    /** Overrides the session-title lookup; used by tests. */
    titleLookup?: (sessionId: string) => Promise<string | undefined>;
}
/**
 * Follow the global mux stream for as long as the plugin is loaded.
 *
 * @returns a disposer that stops the subscription.
 */
export declare function startVoiceInbox(ctx: Context, inbox: VoiceInbox, options?: StartVoiceInboxOptions): () => void;
