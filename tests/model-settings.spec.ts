import { describe, expect, it, vi } from 'vitest'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { Config } from '../src/host/config.ts'
import {
  DEFAULT_REALTIME_VOICE_VOICE,
  isRealtimeVoiceVoice,
  REALTIME_VOICE_MODELS,
  REALTIME_VOICE_PROGRESS_REPORTING,
  REALTIME_VOICE_TURN_DETECTION,
  REALTIME_VOICE_VOICES,
} from '../src/models.ts'
import {
  decodeVoiceModelSettings,
  VoiceModelSettingsController,
  type VoiceModelSettingsValue,
} from '../src/client/model-settings.ts'

describe('realtime voice model settings', () => {
  it('admits only the two provider-compatible realtime models', () => {
    expect(new Config({}).model).toBe(REALTIME_VOICE_MODELS.plus)
    expect(new Config({}).turnDetection).toBe(REALTIME_VOICE_TURN_DETECTION.fast)
    expect(new Config({}).vadThreshold).toBe(0.35)
    expect(new Config({}).progressReporting).toBe(REALTIME_VOICE_PROGRESS_REPORTING.keyOnly)
    expect(new Config({}).progressMinIntervalMs).toBe(45_000)
    expect(new Config({}).progressQuietTaskMs).toBe(20_000)
    expect(new Config({ model: REALTIME_VOICE_MODELS.flash }).model).toBe(REALTIME_VOICE_MODELS.flash)
    expect(() => new Config({ model: 'unrelated-model' as never })).toThrow()
  })

  it('persists an immediate switch and projects the accepted model', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.plus)
    const listeners = new Set<() => void>()
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async (field: string, value: unknown) => {
        const current = snapshot.value!
        snapshot = ready(
          field === 'model' ? value as VoiceModelSettingsValue['model'] : current.model,
          field === 'turnDetection' ? value as VoiceModelSettingsValue['turnDetection'] : current.turnDetection,
        )
        for (const listener of listeners) listener()
      }),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const credentials = {
      describe: vi.fn(async () => ({
        rpcId: 'test',
        result: { ok: true as const, value: { credentials: { DASHSCOPE_API_KEY: { configured: true, writable: true } } } },
      })),
      set: vi.fn(async () => ({ rpcId: 'test', result: { ok: true as const, value: {} } })),
      unset: vi.fn(),
    }
    const controller = new VoiceModelSettingsController(scope, { credentials } as never)

    await controller.select(REALTIME_VOICE_MODELS.flash)

    expect(scope.set).toHaveBeenCalledWith('model', REALTIME_VOICE_MODELS.flash)
    expect(controller.getSnapshot()).toMatchObject({
      available: true,
      model: REALTIME_VOICE_MODELS.flash,
      saving: false,
    })

    await controller.selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.semantic)
    expect(scope.set).toHaveBeenCalledWith('turnDetection', REALTIME_VOICE_TURN_DETECTION.semantic)
    expect(controller.getSnapshot().turnDetection).toBe(REALTIME_VOICE_TURN_DETECTION.semantic)
    controller.dispose()
  })

  it('detects an existing environment/credential key and can replace it write-only', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.flash)
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      set: vi.fn(),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    // DSH 0.1.5 moved the credential seam from `connection.api` to the typed
    // `remote.credentials` namespace, which answers unwrapped results.
    const describe = vi.fn(async () => ({
      ok: true as const,
      value: { DASHSCOPE_API_KEY: { configured: true, writable: true } },
    }))
    const set = vi.fn(async () => ({ ok: true as const, value: undefined }))
    const controller = new VoiceModelSettingsController(
      scope,
      { remote: { credentials: { describe, set } } } as never,
    )
    await vi.waitFor(() => { expect(controller.getSnapshot().apiKeyConfigured).toBe(true) })

    await expect(controller.saveApiKey(' new-secret ')).resolves.toBe(true)
    expect(set).toHaveBeenCalledWith('DASHSCOPE_API_KEY', 'new-secret')
    // The literal is never projected back into browser state.
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('new-secret')
    controller.dispose()
  })

  it('surfaces the Host reason when the credential namespace is unreachable', async () => {
    const scope = {
      getSnapshot: () => ready(REALTIME_VOICE_MODELS.plus),
      subscribe: () => () => {},
      set: vi.fn(),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    // A fiber that forgets to inject `remote.credentials` hits the service
    // resolver, which is the failure this card must report verbatim instead of
    // blaming the user's browser origin.
    const controller = new VoiceModelSettingsController(
      scope,
      { remote: { get credentials(): never { throw new Error('cannot get property "remote.credentials" without inject') } } } as never,
    )

    await expect(controller.saveApiKey('secret')).resolves.toBe(false)
    expect(controller.getSnapshot().apiKeySaving).toBe(false)
    expect(controller.getSnapshot().apiKeyError).toContain('without inject')
    controller.dispose()
  })

  it('rejects malformed browser settings snapshots', () => {
    expect(decodeVoiceModelSettings({ model: REALTIME_VOICE_MODELS.flash })).toMatchObject({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      voice: DEFAULT_REALTIME_VOICE_VOICE,
      vadThreshold: 0.35,
      silenceDurationMs: 500,
      maxHistoryTurns: 20,
      enableSpeechEmotion: true,
      progressReporting: REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
      progressMinIntervalMs: 45_000,
      progressQuietTaskMs: 20_000,
    })
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.semantic,
    })).toMatchObject({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.semantic,
      progressReporting: REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
      progressMinIntervalMs: 45_000,
      progressQuietTaskMs: 20_000,
    })
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: 'unknown',
    })).toBeUndefined()
    expect(decodeVoiceModelSettings({ model: 'other' })).toBeUndefined()
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      progressReporting: 'sometimes',
    })).toBeUndefined()
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      progressMinIntervalMs: -1,
    })).toBeUndefined()
    expect(decodeVoiceModelSettings(null)).toBeUndefined()
  })

  it('persists the progress granularity and its two tuning knobs', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.plus)
    const listeners = new Set<() => void>()
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async (field: string, value: unknown) => {
        snapshot = ready(snapshot.value!.model, snapshot.value!.turnDetection, {
          ...snapshot.value,
          [field]: value,
        } as VoiceModelSettingsValue)
        for (const listener of listeners) listener()
      }),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    await controller.setProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.silent)
    expect(scope.set).toHaveBeenCalledWith('progressReporting', REALTIME_VOICE_PROGRESS_REPORTING.silent)
    expect(controller.getSnapshot().progressReporting).toBe(REALTIME_VOICE_PROGRESS_REPORTING.silent)

    await controller.setProgressMinInterval(90_000)
    expect(controller.getSnapshot().progressMinIntervalMs).toBe(90_000)

    await controller.setProgressQuietTask(0)
    expect(controller.getSnapshot().progressQuietTaskMs).toBe(0)
    controller.dispose()
  })

  it('persists the handoff reporting skill and inline guidance', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.plus)
    const listeners = new Set<() => void>()
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async (field: string, value: unknown) => {
        snapshot = ready(snapshot.value!.model, snapshot.value!.turnDetection, {
          ...snapshot.value,
          [field]: value,
        } as VoiceModelSettingsValue)
        for (const listener of listeners) listener()
      }),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    expect(controller.getSnapshot()).toMatchObject({ handoffSkill: '', handoffInstructions: '' })

    await controller.setHandoffSkill('  voice-supervisor  ')
    expect(scope.set).toHaveBeenCalledWith('handoffSkill', 'voice-supervisor')
    expect(controller.getSnapshot().handoffSkill).toBe('voice-supervisor')

    await controller.setHandoffInstructions('  先说结论。  ')
    expect(scope.set).toHaveBeenCalledWith('handoffInstructions', '先说结论。')
    expect(controller.getSnapshot().handoffInstructions).toBe('先说结论。')
    controller.dispose()
  })

  it('rejects oversized handoff guidance instead of writing it', async () => {
    const scope = {
      getSnapshot: () => ready(REALTIME_VOICE_MODELS.plus),
      subscribe: () => () => {},
      set: vi.fn(),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    // A bare 200-char slug is a legal skill name now, so the rejection cases
    // are: over the field's own limit, and a value that is neither a skill
    // name nor a path.
    await controller.setHandoffSkill('a'.repeat(513))
    await controller.setHandoffSkill('my skill')
    await controller.setHandoffInstructions('b'.repeat(8_001))
    expect(scope.set).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('persists the ring duration and clamps it to a usable range', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.plus)
    const listeners = new Set<() => void>()
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async (field: string, value: unknown) => {
        snapshot = ready(snapshot.value!.model, snapshot.value!.turnDetection, {
          ...snapshot.value,
          [field]: value,
        } as VoiceModelSettingsValue)
        for (const listener of listeners) listener()
      }),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    expect(controller.getSnapshot().ringDurationMs).toBe(5_000)

    await controller.setRingDuration(8_000)
    expect(scope.set).toHaveBeenCalledWith('ringDurationMs', 8_000)
    expect(controller.getSnapshot().ringDurationMs).toBe(8_000)

    // Zero means "never ring": the report still lands in the list.
    await controller.setRingDuration(0)
    expect(controller.getSnapshot().ringDurationMs).toBe(0)

    await controller.setRingDuration(60_001)
    await controller.setRingDuration(-1)
    await controller.setRingDuration(Number.NaN)
    expect(scope.set).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('rejects a malformed ring duration in a remote snapshot', () => {
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      ringDurationMs: 7_500,
    })).toMatchObject({ ringDurationMs: 7_500 })
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      ringDurationMs: -1,
    })).toBeUndefined()
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: REALTIME_VOICE_TURN_DETECTION.fast,
      ringDurationMs: 60_001,
    })).toBeUndefined()
  })

  it('exposes the realtime voice, VAD and history tunables the service accepts', async () => {
    let snapshot = ready(REALTIME_VOICE_MODELS.plus)
    const listeners = new Set<() => void>()
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: vi.fn(async (field: string, value: unknown) => {
        snapshot = ready(snapshot.value!.model, snapshot.value!.turnDetection, {
          ...snapshot.value,
          [field]: value,
        } as VoiceModelSettingsValue)
        for (const listener of listeners) listener()
      }),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    expect(controller.getSnapshot()).toMatchObject({
      voice: DEFAULT_REALTIME_VOICE_VOICE,
      vadThreshold: 0.35,
      silenceDurationMs: 500,
      maxHistoryTurns: 20,
      enableSpeechEmotion: true,
    })

    await controller.selectVoice('loongjohn')
    expect(scope.set).toHaveBeenCalledWith('voice', 'loongjohn')
    expect(controller.getSnapshot().voice).toBe('loongjohn')

    await controller.setVadThreshold(0.6)
    expect(controller.getSnapshot().vadThreshold).toBe(0.6)

    await controller.setSilenceDuration(700)
    expect(controller.getSnapshot().silenceDurationMs).toBe(700)

    await controller.setMaxHistoryTurns(12)
    expect(controller.getSnapshot().maxHistoryTurns).toBe(12)

    await controller.setSpeechEmotion(false)
    expect(scope.set).toHaveBeenCalledWith('enableSpeechEmotion', false)
    expect(controller.getSnapshot().enableSpeechEmotion).toBe(false)
    controller.dispose()
  })

  it('rejects out-of-range tunables instead of writing them', async () => {
    const scope = {
      getSnapshot: () => ready(REALTIME_VOICE_MODELS.plus),
      subscribe: () => () => {},
      set: vi.fn(),
      unset: vi.fn(),
    } as unknown as SettingsScope<VoiceModelSettingsValue>
    const controller = new VoiceModelSettingsController(scope, {
      remote: { credentials: { describe: vi.fn(async () => ({ ok: true, value: {} })) } },
    } as never)

    await controller.setVadThreshold(1.5)
    await controller.setSilenceDuration(100)
    await controller.setMaxHistoryTurns(99)
    expect(scope.set).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('accepts smart_turn_v2 and rejects an unknown turn detection in a snapshot', () => {
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: 'smart_turn_v2',
    })).toMatchObject({ turnDetection: 'smart_turn_v2' })
    expect(decodeVoiceModelSettings({
      model: REALTIME_VOICE_MODELS.flash,
      turnDetection: 'smart_turn_v3',
    })).toBeUndefined()
  })
})

function ready(
  model: VoiceModelSettingsValue['model'],
  turnDetection: VoiceModelSettingsValue['turnDetection'] = REALTIME_VOICE_TURN_DETECTION.fast,
  value?: VoiceModelSettingsValue,
): SettingsScopeSnapshot<VoiceModelSettingsValue> {
  return {
    status: 'ready',
    value: value ?? { model, turnDetection },
    base: { model: REALTIME_VOICE_MODELS.plus, turnDetection: REALTIME_VOICE_TURN_DETECTION.fast },
    user: { model, turnDetection },
    revision: 1,
    writable: true,
    mode: 'host',
  }
}
