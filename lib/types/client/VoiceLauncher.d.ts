import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { VoiceSnapshot } from './controller.ts';
export interface VoiceLauncherInjected {
    hooks: {
        voice: HostObservable<VoiceSnapshot>;
    };
    startSupervisor(): Promise<void>;
    selectTask(taskId: string): Promise<void>;
    createTask(workspace: string, presetId: string): Promise<void>;
}
type Props = PropsRuntime<'shell.overlay'> & InjectFace<VoiceLauncherInjected>;
/** Always mounted: no current conversation is needed to place a call. */
export declare function VoiceLauncher({ useVoice, startSupervisor, selectTask, createTask }: Props): import("react").JSX.Element;
export {};
