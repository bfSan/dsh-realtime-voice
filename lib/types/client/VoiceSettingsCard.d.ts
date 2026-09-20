import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type RealtimeVoiceModel, type RealtimeVoiceProgressReporting, type RealtimeVoiceTurnDetection, type RealtimeVoiceVoice } from '../models.ts';
import type { VoiceModelSettingsSnapshot } from './model-settings.ts';
export interface VoiceSettingsCardInjected {
    hooks: {
        voiceModelSettings: HostObservable<VoiceModelSettingsSnapshot>;
    };
    selectModel: (model: RealtimeVoiceModel) => void;
    selectTurnDetection: (mode: RealtimeVoiceTurnDetection) => void;
    selectVoice: (voice: RealtimeVoiceVoice) => void;
    setVadThreshold: (value: number) => void;
    setSilenceDuration: (value: number) => void;
    setMaxHistoryTurns: (value: number) => void;
    setSpeechEmotion: (value: boolean) => void;
    setStylePrompt: (value: string) => void;
    selectProgressReporting: (mode: RealtimeVoiceProgressReporting) => void;
    setProgressMinInterval: (value: number) => void;
    setProgressQuietTask: (value: number) => void;
    saveApiKey: (value: string) => Promise<boolean>;
}
export type VoiceSettingsCardProps = PropsRuntime<'settings.plugin.item'> & InjectFace<VoiceSettingsCardInjected>;
/** One native Plugins-settings card. Changes persist immediately and affect the next call. */
export declare function VoiceSettingsCard({ useVoiceModelSettings, selectModel, selectTurnDetection, selectVoice, setVadThreshold, setSilenceDuration, setMaxHistoryTurns, setSpeechEmotion, setStylePrompt, selectProgressReporting, setProgressMinInterval, setProgressQuietTask, saveApiKey, }: VoiceSettingsCardProps): import("react").JSX.Element | null;
