import type { Context } from '@deepseek-ai/cordis';
import { type LegacyStreamFrame } from './dsh-runtime-compat.ts';
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
    status: VoiceInboxStatus;
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
    /** Handoffs the live call already spoke, seen before or after their entry. */
    private readonly spokenHandoffs;
    private titleLookup;
    watch(input: WatchHandoffInput): void;
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
