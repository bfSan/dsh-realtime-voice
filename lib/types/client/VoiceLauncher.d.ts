import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { VoiceSnapshot } from './controller.ts';
export interface VoiceLauncherInjected {
    hooks: {
        voice: HostObservable<VoiceSnapshot>;
    };
    startSupervisor(): Promise<void>;
    /** Call a named butler; omitted means the default one. */
    startButler?(butlerId: string): Promise<void>;
    selectTask(taskId: string): Promise<void>;
    createTask(workspace: string, presetId: string): Promise<void>;
    createButler(name: string): Promise<string>;
    butlers: readonly {
        id: string;
        name: string;
    }[];
}
type Props = PropsRuntime<'shell.overlay'> & InjectFace<VoiceLauncherInjected>;
/**
 * Always mounted: no current conversation is needed to place a call.
 *
 * The resting state is a single dial ball — one click connects to the default
 * butler. Choosing or creating a butler lives behind a long press or a right
 * click, so the everyday gesture stays "call someone who knows me".
 */
export declare function VoiceLauncher({ useVoice, startSupervisor, startButler, selectTask, createTask, createButler, butlers }: Props): import("react").JSX.Element;
export {};
