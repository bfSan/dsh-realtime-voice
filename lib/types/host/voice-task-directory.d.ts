export interface VoiceProject {
    id: string;
    path: string;
    title: string;
}
export interface VoiceAgent {
    id: string;
    name?: string;
    broken?: unknown;
}
export interface TaskRef {
    taskId: string;
    sessionId: string;
    workspace: string;
    presetId: string;
}
export interface DirectoryTask {
    sessionId: string;
    running: boolean;
    blank: boolean;
    cwd?: string;
    projections?: {
        values?: unknown;
    };
}
export interface VoiceDirectorySource {
    projects(): Promise<VoiceProject[]>;
    agents(): Promise<VoiceAgent[]>;
    tasks(): Promise<readonly DirectoryTask[]>;
    history(sessionId: string): Promise<unknown[]>;
    create(input: {
        workspaceId: string;
        cwd: string;
        agentPreset: string;
        sessionId: string;
    }): Promise<{
        sessionId: string;
    }>;
}
/** Reads facts from DSH. No query method ever submits a prompt. */
export declare class VoiceTaskDirectory {
    private readonly source;
    private readonly creates;
    constructor(source: VoiceDirectorySource);
    listProjects(): Promise<VoiceProject[]>;
    listAgents(): Promise<VoiceAgent[]>;
    listTasks(): Promise<{
        title: string;
        sessionId: string;
        running: boolean;
        blank: boolean;
        cwd?: string;
        projections?: {
            values?: unknown;
        };
        taskId: string;
    }[]>;
    find(taskId: string): Promise<{
        title: string;
        sessionId: string;
        running: boolean;
        blank: boolean;
        cwd?: string;
        projections?: {
            values?: unknown;
        };
        taskId: string;
    }>;
    readResult(taskId: string): Promise<{
        state: string;
        text?: string;
        turn?: number;
        seq?: number;
        taskId: string;
        sessionId: string;
        running: boolean;
        source: string;
    }>;
    createTask(input: {
        workspace: string;
        presetId: string;
        requestId: string;
    }): Promise<TaskRef>;
    private performCreate;
}
