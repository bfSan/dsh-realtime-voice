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
interface SkillDefinitionLike {
    content?: unknown;
}
export interface SkillRegistryLike {
    get(name: string, options: {
        cwd?: string;
        signal?: AbortSignal;
    }): Promise<SkillDefinitionLike | undefined>;
}
/**
 * The optional services guidance resolution reads. Kept as data rather than a
 * Cordis Context because a service that is not declared in `inject` throws on
 * property access, and this resolver must be callable from a fiber that never
 * injected `skills`.
 */
export interface HandoffGuidanceRuntime {
    skills?: SkillRegistryLike;
    logger?: {
        warn?: (message: string) => void;
    };
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
export declare function resolveHandoffGuidance(runtime: HandoffGuidanceRuntime, config: VoiceConfig, options: HandoffGuidanceContext): Promise<HandoffGuidance>;
export {};
