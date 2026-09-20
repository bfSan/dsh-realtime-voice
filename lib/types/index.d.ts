import type { Context } from '@deepseek-ai/cordis';
import { Config, type VoiceConfig } from './host/config.ts';
export { Config };
export type { VoiceConfig };
/**
 * Host services required before the route can be mounted. `apiProxy` is absent
 * because DSH 0.1.5 removed it: this plugin now installs that legacy surface
 * itself over `sessionController`, so it is a provider of the name rather than
 * a dependent on it.
 */
export declare const inject: string[];
/** Mount one exact WebSocket route. Every accepted connection is owned by this plugin fiber. */
export declare function apply(ctx: Context, config: VoiceConfig): void;
