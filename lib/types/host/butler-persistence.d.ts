import { z } from 'zod';
import { type StoredButlers } from './butler-registry.ts';
/** Official DSH storage-domain declaration for the durable butler roster. */
export declare const butlerStorageSpec: {
    name: string;
    version: number;
    tables: {};
    global: {
        schema: z.ZodType<StoredButlers, unknown, z.core.$ZodTypeInternals<StoredButlers, unknown>>;
        initial: {
            schemaVersion: number;
            butlers: never[];
        };
    };
};
export declare function parseStoredButlers(raw: unknown): StoredButlers;
