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
     * Where the reporting guidance comes from: either a DSH skill name, or a
     * path to a markdown file. Empty means no skill guidance at all - the
     * built-in `dsh-voice-supervisor` skill stays available for anyone who
     * wants it, but nothing is attached unless the operator asks for it.
     */
    handoffSkill: string;
    /** Ad-hoc rules appended after the configured skill body. */
    handoffInstructions: string;
    supervisorSkill: string;
    supervisorInstructions: string;
    /**
     * How long an incoming report rings before falling silent. The report stays
     * in the call-back list either way; zero disables the sound entirely.
     */
    ringDurationMs: number;
    maxConnections: number;
    maxBinaryFrameBytes: number;
    connectTimeoutMs: number;
}
export declare const Config: z<VoiceConfig>;
