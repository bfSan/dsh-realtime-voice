import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import { type VoiceApproval, type VoiceInboxEntry, type VoicePhase, type VoiceQuestion, type VoiceQuestionAnswer, type VoiceOccupancyStatus } from '../protocol.ts';
export type ClientVoicePhase = 'idle' | 'requesting-permission' | VoicePhase | 'error';
export interface VoiceSnapshot {
    supervisor?: boolean;
    phase: ClientVoicePhase;
    sessionId?: string;
    /** Which butler answered this call, when the call is an independent one. */
    butlerId?: string;
    voiceSessionId?: string;
    muted: boolean;
    userTranscript: string;
    assistantTranscript: string;
    agentRunning: boolean;
    agentSummary?: string;
    pendingApproval?: VoiceApproval;
    pendingQuestion?: VoiceQuestion;
    providerModel?: string;
    turnDetection?: 'server_vad' | 'smart_turn' | 'smart_turn_v2';
    elapsedSeconds: number;
    occupancy?: VoiceOccupancyStatus;
    /** Finished handoffs waiting to be reported back by voice. */
    inbox: readonly VoiceInboxEntry[];
    /** IDs the user checked in the call-back list, in selection order. */
    inboxSelection: readonly string[];
    /** IDs the user deferred: still listed, but no longer ringing. */
    snoozedInbox: readonly string[];
    error?: string | undefined;
}
/** Root-lifetime call controller shared by the session button and frame overlay through inject hooks. */
export declare class VoiceCallController implements HostObservable<VoiceSnapshot> {
    private supervisorMode;
    private butlerId;
    private readonly playbackFinalSequences;
    private taskAction;
    refreshButlers(): Promise<readonly {
        id: string;
        name: string;
    }[]>;
    /** Roster snapshot for the launcher; refreshed whenever the panel needs it. */
    private roster;
    butlerRoster(): readonly {
        id: string;
        name: string;
    }[];
    private sendTaskAction;
    private settleTaskAction;
    startSupervisor(): Promise<void>;
    /** Call a named butler instead of the roster default. */
    startButler(butlerId: string): Promise<void>;
    createButler(name: string): Promise<string>;
    selectTask(taskId: string): Promise<void>;
    createTask(workspace: string, presetId: string): Promise<void>;
    private snapshot;
    private readonly listeners;
    private socket;
    private audio;
    private inputSequence;
    private inputStreamId;
    private providerReady;
    private startedAt;
    private timer;
    private reconnectTimer;
    private reconnectAttempt;
    private connectionEpoch;
    private lastReconnectError;
    private ending;
    private presenceTimer;
    private heartbeatTimer;
    private startEpoch;
    private presenceRequestSeq;
    private lastServerSeq;
    private lastOutputStreamId;
    private inboxRevision;
    private answeringInbox;
    /** When the current spoken response started reaching the speaker. */
    private playbackStartedAt;
    getSnapshot: () => VoiceSnapshot;
    subscribe: (listener: () => void) => (() => void);
    startPresence(): void;
    toggleInboxSelection(entryId: string): void;
    selectAllInbox(): void;
    clearInboxSelection(): void;
    /**
     * Stop ringing for one report while leaving it in the list.
     *
     * Snooze stays local on purpose: the Host's `delivered` flag means "already
     * spoken", and a snoozed report has not been spoken, so pushing it to the
     * Host would lose the task rather than defer it.
     */
    snoozeInbox(entryId: string): void;
    /** Take one report immediately, ignoring whatever else is selected. */
    answerInboxOne(entryId: string): Promise<void>;
    /**
     * Ring back: take the call up against the selected task's own session and
     * ask the Host to speak those results in selection order.
     */
    answerInbox(sessionId?: string): Promise<void>;
    /** Keep the task in the list but stop offering it as a call to take. */
    dismissInbox(entryIds: readonly string[]): Promise<void>;
    start(sessionId: string, supervisor?: boolean): Promise<void>;
    end(): Promise<void>;
    toggleMute(): void;
    cancelResponse(): void;
    answerApproval(approvalId: string, outcome: 'allowed-once' | 'rejected'): void;
    answerQuestion(requestId: string, answers: VoiceQuestionAnswer[]): void;
    dispose(): Promise<void>;
    private connect;
    private receive;
    private sendAudio;
    private sendControl;
    private scheduleReconnect;
    private tick;
    /**
     * Stop audible output before the server-side VAD event completes its round trip.
     *
     * The microphone hears the speaker, so the first frames of the AI's own
     * report can look like a person starting to talk. Cancelling on that made
     * reports stop a moment after they began, at random, depending on room echo
     * and output volume. Inside the settle window the local detector no longer
     * cancels by itself: the provider's own VAD, which sees the same audio
     * through the network loop, decides whether a real turn started. Outside the
     * window the fast local path is unchanged, so a deliberate interruption
     * still stops playback immediately.
     */
    private handleLocalSpeechStart;
    private fail;
    private cleanup;
    private refreshPresence;
    /**
     * Presence polling already runs every two seconds, so the call-back list
     * rides that cadence instead of opening a second timer.
     */
    private refreshInbox;
    private startHeartbeat;
    private resetCallCursors;
    private update;
}
/** Presence is authoritative only before this WebUI owns or can resume a call. */
export declare function isVoiceDialUnavailable(snapshot: VoiceSnapshot): boolean;
