/** DSH browser half: official slot registrations backed by one root-lifetime call controller. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-settings-controller/remote'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  REALTIME_VOICE_SETTINGS_NAMESPACE,
  type RealtimeVoiceModel,
  type RealtimeVoiceProgressReporting,
  type RealtimeVoiceTurnDetection,
  type RealtimeVoiceVoice,
} from '../models.ts'
import { VoiceCallController } from './controller.ts'
import { decodeVoiceModelSettings, VoiceModelSettingsController } from './model-settings.ts'
import type { VoiceButtonInjected } from './VoiceButton.tsx'
import { VoiceButton } from './VoiceButton.tsx'
import type { VoiceOverlayInjected } from './VoiceOverlay.tsx'
import { VoiceOverlay } from './VoiceOverlay.tsx'
import { VoiceLauncher, type VoiceLauncherInjected } from './VoiceLauncher.tsx'
import type { VoiceSettingsCardInjected } from './VoiceSettingsCard.tsx'
import { VoiceSettingsCard } from './VoiceSettingsCard.tsx'

// `remote.credentials` is its own Cordis sub-service of the API gateway
// (`remote.<namespace>`), not a plain property of `remote`. A fiber that only
// lists `remote` cannot read it: the service resolver raises
// `cannot get property "remote.credentials" without inject`, which the card
// would otherwise surface as an unhelpful generic failure.
export const inject = ['slots', 'sessions', 'remote', 'remote.credentials', 'settingsScope']

/** Register one composer action and one frame overlay; both disappear with this client fiber. */
export function apply(ctx: Context): void {
  const voice = new VoiceCallController()
  voice.startPresence()
  const modelSettings = new VoiceModelSettingsController(ctx.settingsScope.bind({
    namespace: REALTIME_VOICE_SETTINGS_NAMESPACE,
    decode: decodeVoiceModelSettings,
  }), ctx)
  ctx.effect(() => async () => {
    modelSettings.dispose()
    await voice.dispose()
  }, 'realtime-voice: browser media and settings lifecycle')
  ctx.effect(
    () => ctx.remote.$on('credentials/reference-updated', ref => { modelSettings.refreshCredential(ref) }),
    'realtime-voice: credential state invalidation',
  )

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'realtime-voice',
    order: 20,
    inject: (sessionId: string): VoiceButtonInjected => ({
      hooks: { voice },
      toggle: () => {
        const phase = voice.getSnapshot().phase
        if (phase === 'idle' || phase === 'error') void voice.start(sessionId)
        else void voice.end()
      },
    }),
  }, VoiceButton))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'realtime-voice-launcher',
    order: 99,
    inject: (): VoiceLauncherInjected => ({
      hooks: { voice },
      startSupervisor: () => voice.startSupervisor(),
      startButler: butlerId => voice.startButler(butlerId),
      selectTask: taskId => voice.selectTask(taskId),
      createTask: (workspace, preset) => voice.createTask(workspace, preset),
      createButler: name => voice.createButler(name),
      butlers: voice.butlerRoster(),
    }),
  }, VoiceLauncher))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'realtime-voice',
    order: 100,
    inject: (): VoiceOverlayInjected => ({
      hooks: { voice, voiceModelSettings: modelSettings },
      end: () => voice.end(),
      toggleMute: () => voice.toggleMute(),
      cancelResponse: () => voice.cancelResponse(),
      answerInbox: (sessionId?: string) => { void voice.answerInbox(sessionId) },
      answerInboxOne: (entryId: string) => { void voice.answerInboxOne(entryId) },
      snoozeInbox: (entryId: string) => voice.snoozeInbox(entryId),
      toggleInboxSelection: (entryId: string) => voice.toggleInboxSelection(entryId),
      selectAllInbox: () => voice.selectAllInbox(),
      clearInboxSelection: () => voice.clearInboxSelection(),
      dismissInbox: (entryIds: string[]) => voice.dismissInbox(entryIds),
      answerApproval: (approvalId, outcome) => voice.answerApproval(approvalId, outcome),
      answerQuestion: (requestId, answers) => voice.answerQuestion(requestId, answers),
      openSession: (sessionId) => {
        // Two declarations can name `ctx.sessions` in one Client compilation:
        // the browser `ISessions` this plugin talks to, and the Host
        // `SessionStore` reachable through the controller's own type chain.
        // Only the browser face owns `open()`, so name it explicitly instead
        // of depending on which augmentation merges last.
        const sessions = ctx.sessions as unknown as ISessions
        sessions.open(sessionId as Parameters<ISessions['open']>[0])
      },
    }),
  }, VoiceOverlay))

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: REALTIME_VOICE_SETTINGS_NAMESPACE,
    priority: 30,
    inject: (): VoiceSettingsCardInjected => ({
    hooks: { voiceModelSettings: modelSettings },
      selectModel: (model: RealtimeVoiceModel) => { void modelSettings.select(model) },
      selectTurnDetection: (mode: RealtimeVoiceTurnDetection) => { void modelSettings.selectTurnDetection(mode) },
      selectVoice: (voice: RealtimeVoiceVoice) => { void modelSettings.selectVoice(voice) },
      setVadThreshold: (value: number) => { void modelSettings.setVadThreshold(value) },
      setSilenceDuration: (value: number) => { void modelSettings.setSilenceDuration(value) },
      setMaxHistoryTurns: (value: number) => { void modelSettings.setMaxHistoryTurns(value) },
      setSpeechEmotion: (value: boolean) => { void modelSettings.setSpeechEmotion(value) },
      setStylePrompt: (value: string) => { void modelSettings.setStylePrompt(value) },
      selectProgressReporting: (mode: RealtimeVoiceProgressReporting) => { void modelSettings.setProgressReporting(mode) },
      setProgressMinInterval: (value: number) => { void modelSettings.setProgressMinInterval(value) },
      setProgressQuietTask: (value: number) => { void modelSettings.setProgressQuietTask(value) },
      setHandoffSkill: (value: string) => { void modelSettings.setHandoffSkill(value) },
      setHandoffInstructions: (value: string) => { void modelSettings.setHandoffInstructions(value) },
      setSupervisorSkill: (value: string) => { void modelSettings.setSupervisorSkill(value) },
      setSupervisorInstructions: (value: string) => { void modelSettings.setSupervisorInstructions(value) },
      setRingDuration: (value: number) => { void modelSettings.setRingDuration(value) },
      saveApiKey: (value: string) => modelSettings.saveApiKey(value),
    }),
  }, VoiceSettingsCard))
}
