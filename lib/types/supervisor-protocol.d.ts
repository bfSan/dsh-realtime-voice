import { type VoiceHello } from './protocol.ts';
import type { DirectFunctionTool } from './direct-protocol.ts';
export declare const VOICE_SUPERVISOR_PROTOCOL: "dsh.voice.supervisor.v1";
export declare const VOICE_DIRECTORY_ROUTE = "/api/realtime-voice/directory";
export interface SupervisorHello extends Omit<VoiceHello, 'protocol' | 'target'> {
    protocol: typeof VOICE_SUPERVISOR_PROTOCOL;
    target?: {
        sessionId: string;
    };
}
export declare function isSupervisorHello(raw: unknown): raw is SupervisorHello;
export declare const SUPERVISOR_TOOL_NAMES: readonly ["list_voice_projects", "list_voice_agents", "list_voice_tasks", "read_voice_task_result", "select_voice_task", "create_voice_task", "submit_voice_task", "cancel_voice_task"];
export type SupervisorToolName = typeof SUPERVISOR_TOOL_NAMES[number];
export declare const SUPERVISOR_TOOLS: readonly DirectFunctionTool[];
export declare function parseSupervisorArguments(name: string, json: string): Record<string, string>;
