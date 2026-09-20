import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { VoiceQuestionAnswer } from '../protocol.ts';
import type { VoiceSnapshot } from './controller.ts';
import type { VoiceModelSettingsSnapshot } from './model-settings.ts';
export interface VoiceOverlayInjected {
    hooks: {
        voice: HostObservable<VoiceSnapshot>;
        /** Ring length comes from the Host setting so it stays one source of truth. */
        voiceModelSettings: HostObservable<VoiceModelSettingsSnapshot>;
    };
    end: () => void;
    toggleMute: () => void;
    cancelResponse: () => void;
    answerApproval: (approvalId: string, outcome: 'allowed-once' | 'rejected') => void;
    answerQuestion: (requestId: string, answers: VoiceQuestionAnswer[]) => void;
    answerInbox: (sessionId?: string) => void;
    answerInboxOne: (entryId: string) => void;
    snoozeInbox: (entryId: string) => void;
    toggleInboxSelection: (entryId: string) => void;
    selectAllInbox: () => void;
    clearInboxSelection: () => void;
    dismissInbox: (entryIds: string[]) => void;
    openSession: (sessionId: string) => void;
}
export type VoiceOverlayProps = PropsRuntime<'shell.overlay'> & InjectFace<VoiceOverlayInjected>;
/** Root-level movable call surface that remains visible while the user changes DSH sessions. */
export declare function VoiceOverlay({ useVoice, useVoiceModelSettings, useSessions, end, toggleMute, cancelResponse, answerApproval, answerQuestion, answerInbox, answerInboxOne, snoozeInbox, toggleInboxSelection, selectAllInbox, clearInboxSelection, dismissInbox, openSession, }: VoiceOverlayProps): import("react").JSX.Element | null;
