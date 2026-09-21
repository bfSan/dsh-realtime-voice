import { type HandoffGuidanceRuntime } from './handoff-guidance.ts';
/**
 * Always-on, never configurable. A butler persona may change the tone, but it
 * can never buy back the right to read file paths aloud, to repeat a report,
 * or to decide an authorization on the user's behalf.
 */
export declare const SUPERVISOR_BASE_GUIDANCE: string;
export declare const DEFAULT_SUPERVISOR_GUIDANCE: string;
export declare function resolveSupervisorGuidance(options: {
    skill: string;
    instructions: string;
    butlerBriefing: string;
    cwd?: string;
}, runtime: HandoffGuidanceRuntime): Promise<{
    body: string;
    source: string;
    status: 'default' | 'loaded' | 'error';
    error?: string;
}>;
