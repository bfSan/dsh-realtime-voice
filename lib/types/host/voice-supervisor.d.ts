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
    /**
     * The task object waiting for the user to confirm it out loud.
     *
     * Selection is deliberately two-step. The model used to bind whatever
     * session it inferred from a list, which is how a spoken request landed on
     * the wrong conversation: the list carries titles, not intent, and guessing
     * between two similarly named tasks is not recoverable once work starts.
     * Proposing first and binding only on an explicit "对/可以/就这个" makes the
     * user the one who picks, and leaves the model nothing to infer.
     */
    private pendingSelection;
    /** The creation the user is being asked to approve. */
    private pendingCreation;
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
