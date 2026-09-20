import type { VoiceConfig } from './config.ts';
import { type RealtimeSocketFactory } from './dashscope-realtime.ts';
export declare const VOICE_PREVIEW_TEXT = "\u4F60\u597D\uFF0C\u6211\u662F DSH \u8BED\u97F3\u603B\u7BA1\uFF0C\u8FD9\u662F\u5F53\u524D\u97F3\u8272\u7684\u8BD5\u542C\u3002";
/**
 * Render one fixed, non-task sentence in a fresh provider session. This path
 * deliberately has no tools, DSH session, inbox, or conversation continuity.
 */
export declare function renderVoicePreview(config: VoiceConfig, apiKey: string, socketFactory?: RealtimeSocketFactory): Promise<Buffer>;
export declare function pcmToWav(pcm: Buffer): Buffer;
