import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import { type VoiceApproval, type VoiceInboxEntry, type VoicePhase, type VoiceQuestion, type VoiceQuestionAnswer, type VoiceOccupancyStatus } from '../protocol.ts';
export type ClientVoicePhase = 'idle' | 'requesting-permission' | VoicePhase | 'error';
export interface VoiceSnapshot {
    phase: ClientVoicePhase;
    sessionId?: string;
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
    error?: string | undefined;
}
/** Root-lifetime call controller shared by the session button and frame overlay through inject hooks. */
export declare class VoiceCallController implements HostObservable<VoiceSnapshot> {
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
    getSnapshot: () => VoiceSnapshot;
    subscribe: (listener: () => void) => (() => void);
    startPresence(): void;
    toggleInboxSelection(entryId: string): void;
    selectAllInbox(): void;
    clearInboxSelection(): void;
    /**
     * Ring back: take the call up against the selected task's own session and
     * ask the Host to speak those results in selection order.
     */
    answerInbox(sessionId?: string): Promise<void>;
    /** Keep the task in the list but stop offering it as a call to take. */
    dismissInbox(entryIds: readonly string[]): void;
    private deleteInbox;
    start(sessionId: string): Promise<void>;
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
    /** Stop audible output before the server-side VAD event completes its round trip. */
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
