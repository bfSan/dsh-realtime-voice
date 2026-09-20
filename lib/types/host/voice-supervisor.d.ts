import type { VoiceTaskDirectory } from './voice-task-directory.ts';
export interface SupervisorActions {
    select(taskId: string): Promise<void> | void;
    submit(instruction: string, spokenInput: string): Promise<unknown>;
    cancel(): Promise<unknown>;
}
/** One call routes to explicitly selected DSH tasks; the page's current chat is irrelevant. */
export declare class VoiceSupervisor {
    private readonly callId;
    private readonly directory;
    private readonly actions;
    selectedTask: string | undefined;
    private turn;
    private selecting;
    private readonly receipts;
    constructor(callId: string, directory: VoiceTaskDirectory, actions: SupervisorActions);
    userTurn(id: string, text: string): void;
    reportMode(): void;
    select(taskId: string): Promise<void>;
    execute(name: string, json: string): Promise<unknown>;
}
