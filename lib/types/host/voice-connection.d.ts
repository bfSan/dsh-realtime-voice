import type { IncomingMessage } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type WebSocket from 'ws';
import { type VoiceHello, type VoiceReady } from '../protocol.ts';
import type { VoiceConfig } from './config.ts';
import { VoiceRuntime, type VoiceContinuityState } from './voice-runtime.ts';
import { type HandoffGuidanceRuntime } from './handoff-guidance.ts';
import type { VoiceInbox } from './voice-inbox.ts';
import type { VoiceTaskDirectory } from './voice-task-directory.ts';
import { type ButlerRoster } from './butler-registry.ts';
export declare function supervisorLeaseTarget(butlerId: string | undefined): string;
/** One client-neutral voice call, pinned to one DSH session for its full lifetime. */
export declare class VoiceConnection {
    private readonly ctx;
    private readonly socket;
    private readonly request;
    private readonly config;
    private readonly onClosed;
    private readonly runtime;
    private readonly inbox;
    private readonly guidanceRuntime;
    private readonly directory?;
    private readonly butlers?;
    private supervisorMode;
    private supervisor;
    private butlerId;
    /**
     * Identity block for the butler answering this call.
     *
     * Resolved late and never fatal: a roster that failed to open (or a butler
     * the user has not created yet) must still let the call through.
     */
    private butlerBriefing;
    /**
     * The butler answering right now.
     *
     * Read from the supervisor when one exists, because a mid-call
     * `switch_voice_butler` moves the answerer: the lease keeps the original
     * id, but the voice the user hears must be the new one.
     */
    private currentButler;
    private userTurnSequence;
    private reportReadOnly;
    private readonly provisionalId;
    private continuity;
    private serverSeq;
    private outputSeq;
    private outputStreamId;
    private outputPtsMs;
    private inputStreamId;
    private nextInputSequence;
    private hello;
    private provider;
    private session;
    private coordinator;
    private activeResponseId;
    /** Compatibility gate for clients that did not negotiate local correlated
     * echo filtering. Capable clients keep forwarding near-end speech/pre-roll. */
    private suppressInputDuringPlayback;
    private gatedOutputStreamId;
    private readonly responseStreams;
    private readonly responseLastSequences;
    private readonly responseAudioDurationMs;
    private readonly responseAudioStartedAt;
    private readonly outputPacketizer;
    private browserAudioSendTail;
    private browserAudioGeneration;
    private queuedBrowserAudioBytes;
    private browserAudioTransportFailed;
    private playbackDrainFallbackTimer;
    private readonly suppressedResponses;
    private readonly handledProviderFunctionCalls;
    private readonly providerFunctionScope;
    private functionBridge;
    private latestUserTranscript;
    private agentWorkPending;
    private dshTurnRunning;
    private activeDshJobs;
    private closed;
    private ready;
    private leaseAcquired;
    private helloTimer;
    private hostEventsAbort;
    private readonly pendingAssistantByTurn;
    private readonly reportDelivery;
    private readonly reportAttempts;
    private readonly responseAttempts;
    private readonly streamAttempts;
    private readonly attemptFinalSequences;
    private readonly reportHandoffs;
    /**
     * Bookkeeping for streams a cancel just tore down.
     *
     * A cancel and a drain can cross on the wire: the browser finishes playing a
     * report and posts its acknowledgement while a barge-in is already clearing
     * the bookkeeping. Dropping that acknowledgement made a fully heard report
     * look interrupted forever, which both stranded it in the call-back list and
     * replayed it on the next ring. The entries are held briefly and pruned, so
     * the memory cost stays bounded by the number of recent interruptions.
     */
    private readonly settlingStreams;
    private trace;
    private confirmReport;
    private readonly progressGate;
    private readonly progressCoalescer;
    constructor(ctx: Context, socket: WebSocket, request: IncomingMessage, config: VoiceConfig, onClosed: () => void, runtime?: VoiceRuntime, inbox?: VoiceInbox | undefined, guidanceRuntime?: HandoffGuidanceRuntime, directory?: VoiceTaskDirectory | undefined, butlers?: ButlerRoster | undefined);
    get id(): string;
    dispose(reason?: string): void;
    private receive;
    /**
     * Speak the tasks the user selected from the call-back list, in the order
     * they were selected. Entries are marked delivered here rather than by the
     * browser so a dropped ack cannot make the same task ring twice.
     *
     * The selected reports travel as one announcement on purpose: the provider
     * queue only holds a handful of pending injections, so emitting one per task
     * would silently drop the tail of a long selection.
     */
    private deliverInboxEntries;
    /**
     * Re-arm a pending approval or question the user is ringing back to answer.
     *
     * The live call that first owned this interaction is gone, so its coordinator
     * forgot it. The interaction itself is still held by the compat shim, which
     * is what `answer_dsh_*` ultimately responds through; re-registering it here
     * is what lets the voice answer travel back to the blocked Agent.
     */
    private deliverPendingInteractions;
    private start;
    private bindTask;
    private callTools;
    private bindSupervisorTask;
    private onProviderEvent;
    /** Execute only the small semantic bridge vocabulary exposed to Qwen. */
    private handleFunctionCall;
    private followDshEvents;
    /**
     * Fold durable history after the live mux subscription is open. This closes
     * the provider-connect/reconnect gap without replaying already-terminal
     * handoffs: coordinator transitions are idempotent and scoped by prompt rpcId.
     */
    private reconcileDshHistory;
    private answerApproval;
    private answerQuestion;
    private afterApprovalResolved;
    private afterQuestionResolved;
    private sendApproval;
    private sendQuestion;
    /** Emit one protocol PCM packet and advance the cursor only for that packet. */
    private emitOutputPacket;
    /** Serialize binary sends so response finalization cannot overtake PCM. */
    private enqueueBrowserAudio;
    private sendBrowserAudioFrame;
    private failBrowserAudio;
    private failProviderAudio;
    private clearPlayback;
    private shouldGateInputDuringPlayback;
    /**
     * V1 clients that do not acknowledge playback drain use an estimate of the
     * remaining local queue from delivered PCM and release with a safety margin,
     * so compatibility mode can reduce echo without ever permanently muting mic.
     */
    private schedulePlaybackFallback;
    private releasePlaybackGate;
    /**
     * Remember a stream a cancel just cleared, in case its drain is in flight.
     *
     * The window is short because a browser posts its drain as soon as the queue
     * empties: anything later than this belongs to a different stream, and the
     * monotonic sequence check rejects it anyway.
     */
    private holdSettlingStream;
    private clearSettling;
    /** Stop one response exactly once, even when local and provider VAD race. */
    private interruptActiveResponse;
    private sendTranscript;
    private sendState;
    private refreshAgentWorkPending;
    private fail;
    private send;
    private nextSeq;
    private persistOutputCursor;
    private rpcId;
}
export declare function validateAudioNegotiation(hello: VoiceHello): void;
/** Deterministic negotiated PCM contract; input cadence belongs to the client. */
export declare function negotiateVoiceAudio(hello: VoiceHello, maxBinaryFrameBytes: number): VoiceReady['audio'];
/** Deterministic, platform-neutral hello → ready capability negotiation. */
export declare function negotiateVoiceCapabilities(hello: VoiceHello): VoiceReady['capabilities'];
export declare function buildInstructions(status: {
    running: boolean;
    blank: boolean;
    cwd?: string;
    title?: string;
    summary?: string;
}, continuity?: Pick<VoiceContinuityState, 'userTranscript' | 'assistantTranscript'>): string;
