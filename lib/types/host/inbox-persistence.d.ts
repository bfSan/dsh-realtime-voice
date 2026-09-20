import type { VoiceInboxEntry } from './voice-inbox.ts';
import { z } from 'zod';
export interface StoredInbox {
    schemaVersion: 1;
    entries: VoiceInboxEntry[];
}
/** The DSH domain global handle; storage location and lifecycle belong to DSH. */
export interface InboxGlobal {
    get(): unknown;
    set(value: StoredInbox): Promise<void>;
}
/** Official DSH storage-domain declaration for the durable callback inbox. */
export declare const voiceInboxStorageSpec: {
    name: string;
    version: number;
    tables: {};
    global: {
        schema: z.ZodType<StoredInbox, unknown, z.core.$ZodTypeInternals<StoredInbox, unknown>>;
        initial: {
            schemaVersion: number;
            entries: never[];
        };
    };
};
export declare function parseStoredInbox(raw: unknown): StoredInbox;
export declare class InboxPersistence {
    private readonly global;
    private loaded;
    private chain;
    constructor(global: InboxGlobal);
    load(): Promise<StoredInbox>;
    save(snapshot: StoredInbox): Promise<void>;
}
