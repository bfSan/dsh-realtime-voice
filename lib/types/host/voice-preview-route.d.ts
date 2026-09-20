import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { VoiceConfig } from './config.ts';
import { renderVoicePreview } from './voice-preview.ts';
export declare function createVoicePreviewHandler(ctx: Context, readConfig: () => VoiceConfig, isAllowed: (request: IncomingMessage) => boolean, render?: typeof renderVoicePreview): (request: IncomingMessage, response: ServerResponse) => void;
