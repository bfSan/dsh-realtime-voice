import type { Context } from '@deepseek-ai/cordis';
import type { VoiceConfig } from './config.ts';
/** One handoff prompt cannot carry unbounded guidance text. */
export declare const MAX_HANDOFF_GUIDANCE_LENGTH = 8000;
export interface HandoffGuidance {
    /** Resolved guidance, or undefined when nothing is configured. */
    body?: string;
    /** Set when the user configured a skill name that could not be loaded. */
    missingSkill?: string;
}
export interface HandoffGuidanceContext {
    cwd?: string;
}
/**
 * Resolve the operator-authored guidance that rides along with every voice
 * handoff. A configured DSH skill supplies the body; inline instructions are
 * appended after it so an ad-hoc note can refine a shared skill without
 * editing it.
 *
 * Every failure path degrades to "no guidance" and logs a warning: a mistyped
 * skill name must never be able to reject a user's spoken request.
 */
export declare function resolveHandoffGuidance(ctx: Context, config: VoiceConfig, options: HandoffGuidanceContext): Promise<HandoffGuidance>;
