/** Realtime voice models supported by the built-in DashScope provider. */
export declare const REALTIME_VOICE_MODELS: {
    readonly flash: "qwen-audio-3.0-realtime-flash";
    readonly plus: "qwen-audio-3.0-realtime-plus";
};
export type RealtimeVoiceModel = typeof REALTIME_VOICE_MODELS[keyof typeof REALTIME_VOICE_MODELS];
export declare const REALTIME_VOICE_TURN_DETECTION: {
    readonly fast: "server_vad";
    readonly semantic: "smart_turn";
    readonly semanticV2: "smart_turn_v2";
};
export type RealtimeVoiceTurnDetection = typeof REALTIME_VOICE_TURN_DETECTION[keyof typeof REALTIME_VOICE_TURN_DETECTION];
/** Ordered for the settings card; the service rejects anything outside this set. */
export declare const REALTIME_VOICE_TURN_DETECTION_MODES: readonly RealtimeVoiceTurnDetection[];
/**
 * The exact voice list returned by the service when an unsupported id is sent.
 * Ordering is preserved so the first entry stays the documented default.
 */
export declare const REALTIME_VOICE_VOICES: readonly ["longanqian", "longanlingxin", "longanlufeng", "longanlingxi", "longanxiaoxin", "longanfengyue", "longanyuanfei", "longanhuan_v3.6", "longjielidou_v3.6", "longpaopao_v3.6", "longhuohuo_v3.6", "longchuanshu_v3.6", "loongmary", "loongeva_v3.6", "loongjohn", "daniel", "echo", "hannah", "sherry"];
export type RealtimeVoiceVoice = typeof REALTIME_VOICE_VOICES[number];
/** How much of the DSH Agent's stage-by-stage progress may reach the live call. */
export declare const REALTIME_VOICE_PROGRESS_REPORTING: {
    readonly keyOnly: "key-only";
    readonly silent: "silent";
    readonly all: "all";
};
export type RealtimeVoiceProgressReporting = typeof REALTIME_VOICE_PROGRESS_REPORTING[keyof typeof REALTIME_VOICE_PROGRESS_REPORTING];
export declare const DEFAULT_REALTIME_VOICE_MODEL: RealtimeVoiceModel;
export declare const DEFAULT_REALTIME_VOICE_TURN_DETECTION: RealtimeVoiceTurnDetection;
export declare const DEFAULT_REALTIME_VOICE_VOICE: RealtimeVoiceVoice;
export declare const DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING: RealtimeVoiceProgressReporting;
export declare const REALTIME_VOICE_SETTINGS_NAMESPACE: "realtime-voice";
export declare function isRealtimeVoiceModel(value: unknown): value is RealtimeVoiceModel;
export declare function isRealtimeVoiceTurnDetection(value: unknown): value is RealtimeVoiceTurnDetection;
export declare function isRealtimeVoiceVoice(value: unknown): value is RealtimeVoiceVoice;
export declare function realtimeVoiceVoiceLabel(voice: string | undefined): string;
export declare function isRealtimeVoiceProgressReporting(value: unknown): value is RealtimeVoiceProgressReporting;
export declare function realtimeVoiceModelLabel(model: string | undefined): string;
export declare function realtimeVoiceTurnDetectionLabel(mode: string | undefined): string;
export declare function realtimeVoiceProgressReportingLabel(mode: string | undefined): string;
