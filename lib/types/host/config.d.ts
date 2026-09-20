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
    maxConnections: number;
    maxBinaryFrameBytes: number;
    connectTimeoutMs: number;
}
export declare const Config: z<VoiceConfig>;
