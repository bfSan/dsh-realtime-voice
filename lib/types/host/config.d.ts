import z from '@deepseek-ai/schemastery';
import { type RealtimeVoiceModel, type RealtimeVoiceProgressReporting, type RealtimeVoiceTurnDetection, type RealtimeVoiceVoice } from '../models.ts';
/** Host-side realtime voice configuration; secrets are references, never values. */
export interface VoiceConfig {
    endpoint: string;
    temporaryKeyEndpoint: string;
    temporaryKeyTtlSeconds: number;
    apiKeyEnv: string;
    model: RealtimeVoiceModel;
    voice: RealtimeVoiceVoice;
    turnDetection: RealtimeVoiceTurnDetection;
    vadThreshold: number;
    silenceDurationMs: number;
    maxHistoryTurns: number;
    enableSpeechEmotion: boolean;
    progressReporting: RealtimeVoiceProgressReporting;
    progressMinIntervalMs: number;
    progressQuietTaskMs: number;
    /** User-authored speaking style; appended to the built-in guard rails. */
    stylePrompt: string;
    /**
     * Name of a DSH skill whose body is attached to every execution handoff,
     * so the working Agent reports, plans and inspects in the shape the
     * operator wants read aloud. Defaults to the plugin's built-in skill; a
     * project skill with the same name outranks it, and clearing the field
     * removes all skill guidance.
     */
    handoffSkill: string;
    /** Ad-hoc rules appended after the configured skill body. */
    handoffInstructions: string;
    maxConnections: number;
    maxBinaryFrameBytes: number;
    connectTimeoutMs: number;
}
export declare const Config: z<VoiceConfig>;
