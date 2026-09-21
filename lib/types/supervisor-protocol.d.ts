import { type VoiceHello } from './protocol.ts';
import type { DirectFunctionTool } from './direct-protocol.ts';
export declare const VOICE_SUPERVISOR_PROTOCOL: "dsh.voice.supervisor.v1";
export declare const VOICE_DIRECTORY_ROUTE = "/api/realtime-voice/directory";
export declare const VOICE_BUTLER_ROUTE = "/api/realtime-voice/butlers";
export interface SupervisorHello extends Omit<VoiceHello, 'protocol' | 'target'> {
    protocol: typeof VOICE_SUPERVISOR_PROTOCOL;
    target?: {
        sessionId: string;
    };
    /** Which butler answers this call; absent means the default one. */
    butlerId?: string;
}
export declare const MAX_BUTLER_ID_LENGTH = 64;
export declare function isSupervisorHello(raw: unknown): raw is SupervisorHello;
export declare const SUPERVISOR_TOOL_NAMES: readonly ["list_voice_projects", "list_voice_agents", "list_voice_tasks", "read_voice_task_result", "select_voice_task", "create_voice_task", "confirm_voice_task", "submit_voice_task", "cancel_voice_task", "list_voice_butlers", "switch_voice_butler", "remember_voice_scope", "note_voice_todo"];
export type SupervisorToolName = typeof SUPERVISOR_TOOL_NAMES[number];
export declare const SUPERVISOR_TOOLS: readonly DirectFunctionTool[];
export declare function parseSupervisorArguments(name: string, json: string): Record<string, string>;
