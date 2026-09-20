import { type HandoffGuidanceRuntime } from './handoff-guidance.ts';
export declare const DEFAULT_SUPERVISOR_GUIDANCE: string;
export declare function resolveSupervisorGuidance(options: {
    skill: string;
    instructions: string;
    cwd?: string;
}, runtime: HandoffGuidanceRuntime): Promise<{
    body: string;
    source: string;
    status: 'default' | 'loaded' | 'error';
    error?: string;
}>;
