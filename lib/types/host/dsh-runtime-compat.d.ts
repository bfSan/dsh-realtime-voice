import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /**
         * Legacy voice host bridge. DSH 0.1.5 deleted the shipped service, so this
         * plugin installs its own implementation over `sessionController`.
         */
        apiProxy: LegacyApiProxy;
    }
    interface Events {
        /**
         * Approval answerer waterfall, declared by `@deepseek-ai/dsh-user-approval`.
         *
         * Restated locally instead of importing that package: it is a Host-only
         * capability this plugin neither depends on nor ships, and taking it as a
         * dependency would drag a second, older DSH tree into the install. The
         * signature matches the shipped declaration exactly, so the listener below
         * stays type-checked against the real contract.
         */
        'approval/request'(request: ApprovalRequestLike, next: () => Promise<unknown>): Promise<unknown>;
        /**
         * User-question answerer waterfall, declared by
         * `@deepseek-ai/dsh-user-questions`; restated locally for the same reason.
         */
        'user-questions/request'(request: UserQuestionRequestLike, next: () => Promise<unknown>): Promise<unknown>;
    }
}
export interface LegacyResult<T> {
    result: {
        ok: true;
        value: T;
    } | {
        ok: false;
        error: {
            message: string;
        };
    };
}
export interface LegacyQuestionItem {
    id: string;
    question: string;
    detail?: string;
    header?: string;
    options?: {
        label: string;
        description?: string;
    }[];
    multiSelect?: boolean;
}
export interface LegacyQueueItem {
    id: string;
    placement: string;
    rpcId?: string;
    message?: {
        id: string;
        content: readonly unknown[];
    };
}
export interface LegacyJobItem {
    id: string;
    label: string;
    status: string;
}
/**
 * One legacy mux/host frame body.
 *
 * The rc.7 union lived in the deleted `dsh-host-apiproxy` package. This is the
 * subset the voice host actually consumes, restated so both the producer here
 * and every consumer narrow on one shared `type` discriminant.
 */
export type LegacyFramePayload = {
    type: 'host/session-status';
    sessionId: string;
    running: boolean;
} | {
    type: 'host/agent-error';
    sessionId: string;
    error: string;
} | {
    type: 'approval/requested';
    rpcId: string;
    sessionId: string;
    approvalId: string;
    toolName: string;
    callId?: string;
    reason?: string;
} | {
    type: 'approval/resolved';
    rpcId: string;
    sessionId: string;
    approvalId: string;
    outcome: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable';
} | {
    type: 'question/requested';
    rpcId: string;
    sessionId: string;
    questions: LegacyQuestionItem[];
} | {
    type: 'question/resolved';
    rpcId: string;
    sessionId: string;
    questionRpcId: string;
    outcome: 'answered' | 'cancelled';
} | {
    type: 'session/queue';
    sessionId: string;
    items: readonly LegacyQueueItem[];
} | {
    type: 'session/jobs';
    sessionId: string;
    jobs: readonly LegacyJobItem[];
} | {
    type: 'session/event';
    sessionId: string;
    event: {
        type: string;
        seq?: number;
        data?: unknown;
    };
};
export interface LegacyStreamFrame {
    rpcId: string;
    payload: LegacyFramePayload;
}
/**
 * Correlation identity for one legacy request/response pair.
 *
 * DSH 0.1.5 dropped `RpcId` with the `apiProxy` package it lived in, but the
 * value was always just a freshly minted UUID string. Keeping the nominal
 * helper preserves the call sites' intent — an id minted here, not a session
 * or tool id — without reintroducing the deleted package.
 */
export type RpcId = string & {
    readonly __rpcId?: unique symbol;
};
/** Brand one UUID as a legacy request correlation id. */
export declare function RpcId(id: string): RpcId;
/**
 * Session row as the rc.7 host bridge consumed it. The surviving service
 * returns the same fields, so the legacy surface passes them straight through
 * while the coordinator keeps reading `sessionId`/`running`/`blank`/`cwd` and
 * `projections.values.title`.
 */
export interface LegacySessionSummary {
    sessionId: string;
    running: boolean;
    blank: boolean;
    cwd?: string;
    projections?: {
        values?: unknown;
    } | undefined;
}
export interface LegacyHistoryRecord {
    event: unknown;
}
interface InteractionRequestLike {
    agent?: {
        id?: unknown;
        session?: {
            id?: unknown;
        };
    };
}
interface ApprovalRequestLike extends InteractionRequestLike {
    toolName?: unknown;
    callId?: unknown;
    reason?: unknown;
}
interface UserQuestionRequestLike extends InteractionRequestLike {
    questions?: unknown;
}
export interface LegacyApiProxy {
    sessions: {
        list(request: {
            rpcId: string;
            payload: unknown;
        }): Promise<LegacyResult<{
            items: readonly LegacySessionSummary[];
        }>>;
        history(request: {
            rpcId: string;
            payload: {
                sessionId: SessionId;
                maxMessages?: number;
            };
        }): Promise<LegacyResult<{
            events: readonly {
                event: unknown;
            }[];
        }>>;
        prompt(request: {
            rpcId: string;
            payload: {
                sessionId: SessionId;
                mode: 'queue' | 'steer';
                content: readonly unknown[];
            };
        }): Promise<LegacyResult<{
            accepted: true;
        }>>;
        updateQueue(request: {
            rpcId: string;
            payload: {
                sessionId: SessionId;
                itemId: never;
                action: {
                    kind: 'remove';
                };
            };
        }): Promise<LegacyResult<{
            accepted: true;
        }>>;
        cancel(request: {
            rpcId: string;
            payload: {
                sessionId: SessionId;
            };
        }): Promise<LegacyResult<{
            accepted: true;
        }>>;
    };
    events: {
        host(request: {
            rpcId: string;
            payload: unknown;
        }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>;
        mux(request: {
            rpcId: string;
            payload: unknown;
        }, signal: AbortSignal): AsyncIterable<LegacyStreamFrame>;
    };
    respond(envelope: {
        type: 'client-response';
        rpcId: string;
        result: unknown;
    }): Promise<{
        accepted: boolean;
        reason?: string;
    }>;
}
export interface InstallCompatOptions {
    isVoiceSession?: (sessionId: string) => boolean;
    serviceName?: string;
}
export declare function installApiProxyCompat(ctx: Context, options?: InstallCompatOptions): void;
export {};
