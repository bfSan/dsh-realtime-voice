import { type ButlerRoster } from './butler-registry.ts';
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
    private readonly butlers?;
    selectedTask: string | undefined;
    /** Which butler answers this call; undefined means the roster default. */
    readonly butlerId: string | undefined;
    private turn;
    private selecting;
    private readonly receipts;
    constructor(callId: string, directory: VoiceTaskDirectory, actions: SupervisorActions, butlers?: ButlerRoster | undefined, butlerId?: string);
    private require;
    /** The butler answering right now: the named one, or the roster default. */
    private currentButler;
    userTurn(id: string, text: string): void;
    reportMode(): void;
    select(taskId: string): Promise<void>;
    execute(name: string, json: string): Promise<unknown>;
}
