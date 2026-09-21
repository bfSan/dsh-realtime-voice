/**
 * The roster of voice butlers.
 *
 * A butler is the identity the user calls: it owns a scope (what it looks
 * after) and a short memory of the tasks it already ran. It is an index over
 * DSH sessions, never a second source of truth — DSH still owns the
 * transcripts, and every summary here may be corrected out loud.
 */
export declare const MAX_BUTLER_TASKS = 20;
export declare const MAX_BUTLER_NOTES = 20;
/** One spoken briefing cannot carry an unbounded history. */
export declare const MAX_BUTLER_SUMMARY_LENGTH = 200;
export interface ButlerScope {
    projects?: string[];
    keywords?: string[];
    defaultAgentPresetId?: string;
}
export interface ButlerTaskRef {
    sessionId: string;
    title: string;
    projectId?: string;
    presetId?: string;
    lastTouchedAt: number;
    lastSummary: string;
}
export interface ButlerMemory {
    tasks: ButlerTaskRef[];
    notes: string[];
}
export interface VoiceButler {
    id: string;
    name: string;
    createdAt: number;
    lastUsedAt: number;
    scope: ButlerScope;
    memory: ButlerMemory;
}
export interface StoredButlers {
    schemaVersion: 1;
    butlers: VoiceButler[];
    defaultButlerId?: string;
}
/**
 * The slice of the roster a live call needs. Kept narrow so a connection can
 * hold the registry itself while still resolving the butler at call time.
 */
export interface ButlerRoster {
    get(id: string): VoiceButler | undefined;
    resolveDefault(): VoiceButler | undefined;
}
export declare class ButlerRegistry {
    private readonly butlers;
    private defaultButler;
    private onChange;
    setOnChange(listener: (() => void) | undefined): void;
    private changed;
    create(name: string): VoiceButler;
    rename(id: string, name: string): VoiceButler;
    get(id: string): VoiceButler | undefined;
    list(): readonly VoiceButler[];
    remove(id: string): boolean;
    setDefault(id: string): void;
    defaultId(): string | undefined;
    /** Default butler for a new call: the default one, or the first known. */
    resolveDefault(): VoiceButler | undefined;
    touch(id: string, task: ButlerTaskRef): void;
    setScope(id: string, scope: ButlerScope): void;
    addNote(id: string, note: string): void;
    snapshot(): StoredButlers;
    restore(stored: StoredButlers): void;
    private require;
}
/**
 * The identity block injected into the realtime model at call setup.
 *
 * Deliberately short and path-free: this is what the caller hears first, so it
 * carries who the butler is, what it looks after, and the one task it last
 * touched — nothing about any other butler.
 */
export declare function buildButlerBriefing(butler: VoiceButler): string;
