import type { VoiceInboxEntry } from '../protocol.ts';
export declare function CallBackList(props: {
    waiting: readonly VoiceInboxEntry[];
    snoozed: readonly string[];
    selection: readonly string[];
    onToggle: (entryId: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onDismiss: (entryIds: string[]) => void;
    onAnswer: () => void;
    /** Take one task's report straight away, without touching the selection. */
    onAnswerOne: (entryId: string) => void;
    /** Stop the ring for this report but keep it in the list. */
    onSnooze: (entryId: string) => void;
}): import("react").JSX.Element;
