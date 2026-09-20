import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { Context } from '@deepseek-ai/cordis';
import { type RealtimeVoiceModel, type RealtimeVoiceProgressReporting, type RealtimeVoiceTurnDetection, type RealtimeVoiceVoice } from '../models.ts';
export interface VoiceModelSettingsValue {
    model: RealtimeVoiceModel;
    turnDetection: RealtimeVoiceTurnDetection;
    voice?: RealtimeVoiceVoice;
    vadThreshold?: number;
    silenceDurationMs?: number;
    maxHistoryTurns?: number;
    enableSpeechEmotion?: boolean;
    stylePrompt?: string;
    progressReporting?: RealtimeVoiceProgressReporting;
    progressMinIntervalMs?: number;
    progressQuietTaskMs?: number;
    handoffSkill?: string;
    handoffInstructions?: string;
    ringDurationMs?: number;
    apiKeyEnv?: string;
}
export interface VoiceModelSettingsSnapshot {
    available: boolean;
    writable: boolean;
    model: RealtimeVoiceModel;
    turnDetection: RealtimeVoiceTurnDetection;
    voice: RealtimeVoiceVoice;
    vadThreshold: number;
    silenceDurationMs: number;
    maxHistoryTurns: number;
    enableSpeechEmotion: boolean;
    stylePrompt: string;
    progressReporting: RealtimeVoiceProgressReporting;
    progressMinIntervalMs: number;
    progressQuietTaskMs: number;
    handoffSkill: string;
    handoffInstructions: string;
    ringDurationMs: number;
    saving: boolean;
    error: string | undefined;
    apiKeyRef: string;
    apiKeyConfigured: boolean;
    apiKeyWritable: boolean;
    apiKeySaving: boolean;
    apiKeyError: string | undefined;
}
/** Project one durable DSH settings namespace into an immediate two-model switch. */
export declare class VoiceModelSettingsController implements HostObservable<VoiceModelSettingsSnapshot> {
    private readonly scope;
    private readonly ctx;
    private snapshot;
    private readonly listeners;
    private readonly unsubscribe;
    private disposed;
    constructor(scope: SettingsScope<VoiceModelSettingsValue>, ctx: Context);
    getSnapshot: () => VoiceModelSettingsSnapshot;
    subscribe: (listener: () => void) => (() => void);
    select(model: RealtimeVoiceModel): Promise<void>;
    selectTurnDetection(turnDetection: RealtimeVoiceTurnDetection): Promise<void>;
    setProgressReporting(progressReporting: RealtimeVoiceProgressReporting): Promise<void>;
    selectVoice(voice: RealtimeVoiceVoice): Promise<void>;
    setVadThreshold(vadThreshold: number): Promise<void>;
    setSilenceDuration(silenceDurationMs: number): Promise<void>;
    setMaxHistoryTurns(maxHistoryTurns: number): Promise<void>;
    setSpeechEmotion(enableSpeechEmotion: boolean): Promise<void>;
    setStylePrompt(stylePrompt: string): Promise<void>;
    setProgressMinInterval(progressMinIntervalMs: number): Promise<void>;
    setProgressQuietTask(progressQuietTaskMs: number): Promise<void>;
    /**
     * Name of a DSH skill that rides along with every execution handoff. Blank
     * clears it. Non empty values are validated on the Host against the live
     * skill registry, so a typo is reported in the transcript rather than
     * silently ignored.
     */
    setHandoffSkill(handoffSkill: string): Promise<void>;
    setHandoffInstructions(handoffInstructions: string): Promise<void>;
    setRingDuration(ringDurationMs: number): Promise<void>;
    /** One write path for the scalar settings that only need a value round-trip. */
    private writeSetting;
    /** Write through DSH's write-only credential seam; the literal is never stored in this controller. */
    saveApiKey(value: string): Promise<boolean>;
    /** Refresh only when the Host reports that this card's credential changed. */
    refreshCredential(ref: string): void;
    /**
     * Bound scope disposer plus the credential mirror. The injected Context is
     * used only through `remote.credentials`, so a stale context after teardown
     * cannot re-read; `disposed` closes that window explicitly.
     */
    dispose(): void;
    private adoptScope;
    private readCredential;
    private apiKeyRef;
    private publish;
}
/** Reject malformed remote settings snapshots before they reach the switch. */
export declare function decodeVoiceModelSettings(value: unknown): VoiceModelSettingsValue | undefined;
