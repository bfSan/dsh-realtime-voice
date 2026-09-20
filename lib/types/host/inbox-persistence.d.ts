import type { VoiceInboxEntry } from './voice-inbox.ts';
export interface StoredInbox {
    schemaVersion: 1;
    entries: VoiceInboxEntry[];
}
/** The DSH domain global handle; storage location and lifecycle belong to DSH. */
export interface InboxGlobal {
    get(): unknown;
    set(value: StoredInbox): Promise<void>;
}
export declare function parseStoredInbox(raw: unknown): StoredInbox;
export declare class InboxPersistence {
    private readonly global;
    private loaded;
    private chain;
    constructor(global: InboxGlobal);
    load(): Promise<StoredInbox>;
    save(snapshot: StoredInbox): Promise<void>;
}
