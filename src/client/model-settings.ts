import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-api-settings-controller/remote'
import {
  DEFAULT_REALTIME_VOICE_MODEL,
  DEFAULT_RING_DURATION_MS,
  DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING,
  DEFAULT_REALTIME_VOICE_TURN_DETECTION,
  DEFAULT_REALTIME_VOICE_VOICE,
  isRealtimeVoiceModel,
  isRealtimeVoiceProgressReporting,
  isRealtimeVoiceTurnDetection,
  isRealtimeVoiceVoice,
  type RealtimeVoiceModel,
  type RealtimeVoiceProgressReporting,
  type RealtimeVoiceTurnDetection,
  type RealtimeVoiceVoice,
} from '../models.ts'

export interface VoiceModelSettingsValue {
  model: RealtimeVoiceModel
  turnDetection: RealtimeVoiceTurnDetection
  voice?: RealtimeVoiceVoice
  vadThreshold?: number
  silenceDurationMs?: number
  maxHistoryTurns?: number
  enableSpeechEmotion?: boolean
  stylePrompt?: string
  progressReporting?: RealtimeVoiceProgressReporting
  progressMinIntervalMs?: number
  progressQuietTaskMs?: number
  handoffSkill?: string
  handoffInstructions?: string
  ringDurationMs?: number
  apiKeyEnv?: string
}

export interface VoiceModelSettingsSnapshot {
  available: boolean
  writable: boolean
  model: RealtimeVoiceModel
  turnDetection: RealtimeVoiceTurnDetection
  voice: RealtimeVoiceVoice
  vadThreshold: number
  silenceDurationMs: number
  maxHistoryTurns: number
  enableSpeechEmotion: boolean
  stylePrompt: string
  progressReporting: RealtimeVoiceProgressReporting
  progressMinIntervalMs: number
  progressQuietTaskMs: number
  handoffSkill: string
  handoffInstructions: string
  ringDurationMs: number
  saving: boolean
  error: string | undefined
  apiKeyRef: string
  apiKeyConfigured: boolean
  apiKeyWritable: boolean
  apiKeySaving: boolean
  apiKeyError: string | undefined
}

const DEFAULT_API_KEY_REF = 'DASHSCOPE_API_KEY'
const DEFAULT_PROGRESS_MIN_INTERVAL_MS = 45_000
const DEFAULT_PROGRESS_QUIET_TASK_MS = 20_000
const DEFAULT_VAD_THRESHOLD = 0.35
const DEFAULT_SILENCE_DURATION_MS = 500
const DEFAULT_MAX_HISTORY_TURNS = 20
const MAX_STYLE_PROMPT_LENGTH = 2_000
/** Long enough for a deep absolute path, short enough to stay a setting. */
const MAX_HANDOFF_SKILL_LENGTH = 512
const MAX_HANDOFF_INSTRUCTIONS_LENGTH = 8_000

/** Project one durable DSH settings namespace into an immediate two-model switch. */
export class VoiceModelSettingsController implements HostObservable<VoiceModelSettingsSnapshot> {
  private snapshot: VoiceModelSettingsSnapshot = {
    available: false,
    writable: false,
    model: DEFAULT_REALTIME_VOICE_MODEL,
    turnDetection: DEFAULT_REALTIME_VOICE_TURN_DETECTION,
    voice: DEFAULT_REALTIME_VOICE_VOICE,
    vadThreshold: DEFAULT_VAD_THRESHOLD,
    silenceDurationMs: DEFAULT_SILENCE_DURATION_MS,
    maxHistoryTurns: DEFAULT_MAX_HISTORY_TURNS,
    enableSpeechEmotion: true,
    stylePrompt: '',
    progressReporting: DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING,
    progressMinIntervalMs: DEFAULT_PROGRESS_MIN_INTERVAL_MS,
    progressQuietTaskMs: DEFAULT_PROGRESS_QUIET_TASK_MS,
    handoffSkill: '',
    handoffInstructions: '',
    ringDurationMs: DEFAULT_RING_DURATION_MS,
    saving: false,
    error: undefined,
    apiKeyRef: DEFAULT_API_KEY_REF,
    apiKeyConfigured: false,
    apiKeyWritable: true,
    apiKeySaving: false,
    apiKeyError: undefined,
  }
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribe: () => void
  private disposed = false

  constructor(
    private readonly scope: SettingsScope<VoiceModelSettingsValue>,
    private readonly ctx: Context,
  ) {
    this.unsubscribe = scope.subscribe(() => { this.adoptScope() })
    this.adoptScope()
    void this.readCredential()
  }

  getSnapshot = (): VoiceModelSettingsSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async select(model: RealtimeVoiceModel): Promise<void> {
    if (!this.snapshot.available || !this.snapshot.writable || this.snapshot.saving || model === this.snapshot.model) return
    this.publish({ ...this.snapshot, saving: true, error: undefined })
    try {
      await this.scope.set('model', model)
      const accepted = this.scope.getSnapshot().value?.model
      if (accepted !== model) throw new Error('DSH 没有接受该模型设置。')
      this.publish({ ...this.snapshot, model, saving: false, error: undefined })
    } catch (error) {
      this.publish({
        ...this.snapshot,
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async selectTurnDetection(turnDetection: RealtimeVoiceTurnDetection): Promise<void> {
    if (!this.snapshot.available
      || !this.snapshot.writable
      || this.snapshot.saving
      || turnDetection === this.snapshot.turnDetection) return
    this.publish({ ...this.snapshot, saving: true, error: undefined })
    try {
      await this.scope.set('turnDetection', turnDetection)
      const accepted = this.scope.getSnapshot().value?.turnDetection
      if (accepted !== turnDetection) throw new Error('DSH 没有接受该打断模式。')
      this.publish({ ...this.snapshot, turnDetection, saving: false, error: undefined })
    } catch (error) {
      this.publish({
        ...this.snapshot,
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async setProgressReporting(progressReporting: RealtimeVoiceProgressReporting): Promise<void> {
    await this.writeSetting('progressReporting', progressReporting, 'DSH 没有接受该播报粒度。')
  }

  async selectVoice(voice: RealtimeVoiceVoice): Promise<void> {
    await this.writeSetting('voice', voice, 'DSH 没有接受该音色。')
  }

  async setVadThreshold(vadThreshold: number): Promise<void> {
    if (!Number.isFinite(vadThreshold) || vadThreshold < -1 || vadThreshold > 1) return
    await this.writeSetting('vadThreshold', roundTo(vadThreshold, 2), 'DSH 没有接受该 VAD 灵敏度。')
  }

  async setSilenceDuration(silenceDurationMs: number): Promise<void> {
    if (!Number.isInteger(silenceDurationMs) || silenceDurationMs < 200 || silenceDurationMs > 6_000) return
    await this.writeSetting('silenceDurationMs', silenceDurationMs, 'DSH 没有接受该静音时长。')
  }

  async setMaxHistoryTurns(maxHistoryTurns: number): Promise<void> {
    if (!Number.isInteger(maxHistoryTurns) || maxHistoryTurns < 1 || maxHistoryTurns > 50) return
    await this.writeSetting('maxHistoryTurns', maxHistoryTurns, 'DSH 没有接受该历史轮数。')
  }

  async setSpeechEmotion(enableSpeechEmotion: boolean): Promise<void> {
    await this.writeSetting('enableSpeechEmotion', enableSpeechEmotion, 'DSH 没有接受该情绪增强设置。')
  }

  async setStylePrompt(stylePrompt: string): Promise<void> {
    const trimmed = stylePrompt.trim().slice(0, MAX_STYLE_PROMPT_LENGTH)
    await this.writeSetting('stylePrompt', trimmed, 'DSH 没有接受该说话风格设置。')
  }

  async setProgressMinInterval(progressMinIntervalMs: number): Promise<void> {
    if (!Number.isInteger(progressMinIntervalMs) || progressMinIntervalMs < 0 || progressMinIntervalMs > 600_000) return
    await this.writeSetting('progressMinIntervalMs', progressMinIntervalMs, 'DSH 没有接受该播报间隔。')
  }

  async setProgressQuietTask(progressQuietTaskMs: number): Promise<void> {
    if (!Number.isInteger(progressQuietTaskMs) || progressQuietTaskMs < 0 || progressQuietTaskMs > 600_000) return
    await this.writeSetting('progressQuietTaskMs', progressQuietTaskMs, 'DSH 没有接受该静默阈值。')
  }

  /**
   * Name of a DSH skill that rides along with every execution handoff. Blank
   * clears it. Non empty values are validated on the Host against the live
   * skill registry, so a typo is reported in the transcript rather than
   * silently ignored.
   */
  async setHandoffSkill(handoffSkill: string): Promise<void> {
    const trimmed = handoffSkill.trim()
    if (trimmed.length > MAX_HANDOFF_SKILL_LENGTH) return
    if (trimmed !== '' && !isHandoffSkillOrPath(trimmed)) return
    await this.writeSetting('handoffSkill', trimmed, 'DSH 没有接受该汇报 Skill 设置。')
  }

  async setHandoffInstructions(handoffInstructions: string): Promise<void> {
    const trimmed = handoffInstructions.trim()
    if (trimmed.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH) return
    await this.writeSetting('handoffInstructions', trimmed, 'DSH 没有接受该汇报指令。')
  }

  async setRingDuration(ringDurationMs: number): Promise<void> {
    if (!Number.isInteger(ringDurationMs) || ringDurationMs < 0 || ringDurationMs > 60_000) return
    await this.writeSetting('ringDurationMs', ringDurationMs, 'DSH 没有接受该响铃时长。')
  }

  /** One write path for the scalar settings that only need a value round-trip. */
  private async writeSetting<K extends keyof VoiceModelSettingsValue>(
    field: K,
    value: VoiceModelSettingsValue[K],
    mismatchMessage: string,
  ): Promise<void> {
    if (!this.snapshot.available || !this.snapshot.writable || this.snapshot.saving) return
    if (this.scope.getSnapshot().value?.[field] === value) return
    this.publish({ ...this.snapshot, saving: true, error: undefined })
    try {
      await this.scope.set(field, value)
      const accepted = this.scope.getSnapshot().value?.[field]
      if (accepted !== value) throw new Error(mismatchMessage)
      this.publish({ ...this.snapshot, saving: false, error: undefined })
    } catch (error) {
      this.publish({
        ...this.snapshot,
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /** Write through DSH's write-only credential seam; the literal is never stored in this controller. */
  async saveApiKey(value: string): Promise<boolean> {
    const key = value.trim()
    if (key === '' || !this.snapshot.apiKeyWritable || this.snapshot.apiKeySaving) return false
    const ref = this.apiKeyRef()
    this.publish({ ...this.snapshot, apiKeySaving: true, apiKeyError: undefined })
    try {
      const response = await this.ctx.remote.credentials.set(ref as never, key)
      if (!response.ok) throw new Error('DSH credentials 拒绝了该密钥。')
      await this.readCredential()
      const configured = this.snapshot.apiKeyRef === ref && this.snapshot.apiKeyConfigured
      this.publish({
        ...this.snapshot,
        apiKeySaving: false,
        apiKeyError: configured ? undefined : '密钥写入后未能确认，请重试。',
      })
      return configured
    } catch (error) {
      // Keep the Host's own reason. A missing `remote.credentials` injection, a
      // read-only credential layer and a refused write all land here, and the
      // reason is the only thing that tells them apart.
      const reason = error instanceof Error ? error.message : String(error)
      this.publish({ ...this.snapshot, apiKeySaving: false, apiKeyError: `API Key 保存失败：${reason}` })
      return false
    }
  }

  /** Refresh only when the Host reports that this card's credential changed. */
  refreshCredential(ref: string): void {
    if (ref === this.apiKeyRef()) void this.readCredential()
  }

  /**
   * Bound scope disposer plus the credential mirror. The injected Context is
   * used only through `remote.credentials`, so a stale context after teardown
   * cannot re-read; `disposed` closes that window explicitly.
   */
  dispose(): void {
    this.disposed = true
    this.unsubscribe()
    this.listeners.clear()
  }

  private adoptScope(): void {
    const scope = this.scope.getSnapshot()
    const model = scope.value?.model
    const turnDetection = scope.value?.turnDetection
    const voice = scope.value?.voice ?? DEFAULT_REALTIME_VOICE_VOICE
    const vadThreshold = scope.value?.vadThreshold ?? DEFAULT_VAD_THRESHOLD
    const silenceDurationMs = scope.value?.silenceDurationMs ?? DEFAULT_SILENCE_DURATION_MS
    const maxHistoryTurns = scope.value?.maxHistoryTurns ?? DEFAULT_MAX_HISTORY_TURNS
    const enableSpeechEmotion = scope.value?.enableSpeechEmotion ?? true
    const stylePrompt = scope.value?.stylePrompt ?? ''
    const progressReporting = scope.value?.progressReporting ?? DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING
    const progressMinIntervalMs = scope.value?.progressMinIntervalMs ?? DEFAULT_PROGRESS_MIN_INTERVAL_MS
    const progressQuietTaskMs = scope.value?.progressQuietTaskMs ?? DEFAULT_PROGRESS_QUIET_TASK_MS
    const handoffSkill = scope.value?.handoffSkill ?? ''
    const handoffInstructions = scope.value?.handoffInstructions ?? ''
    const ringDurationMs = scope.value?.ringDurationMs ?? DEFAULT_RING_DURATION_MS
    const previousRef = this.snapshot.apiKeyRef
    const apiKeyRef = this.apiKeyRef()
    this.publish({
      ...this.snapshot,
      available: scope.status === 'ready'
        && isRealtimeVoiceModel(model)
        && isRealtimeVoiceTurnDetection(turnDetection)
        && isRealtimeVoiceVoice(voice)
        && isRealtimeVoiceProgressReporting(progressReporting),
      writable: scope.writable,
      ...(isRealtimeVoiceModel(model) ? { model } : {}),
      ...(isRealtimeVoiceTurnDetection(turnDetection) ? { turnDetection } : {}),
      ...(isRealtimeVoiceVoice(voice) ? { voice } : {}),
      vadThreshold,
      silenceDurationMs,
      maxHistoryTurns,
      enableSpeechEmotion,
      stylePrompt,
      progressReporting,
      progressMinIntervalMs,
      progressQuietTaskMs,
      handoffSkill,
      handoffInstructions,
      ringDurationMs,
      apiKeyRef,
      ...(apiKeyRef === previousRef ? {} : { apiKeyConfigured: false }),
    })
    if (apiKeyRef !== previousRef) void this.readCredential()
  }

  private async readCredential(): Promise<void> {
    const ref = this.apiKeyRef()
    try {
      const response = await this.ctx.remote.credentials.describe([ref as never])
      if (this.disposed || !response.ok || ref !== this.apiKeyRef()) return
      const credential = response.value[ref]
      this.publish({
        ...this.snapshot,
        apiKeyRef: ref,
        apiKeyConfigured: credential?.configured ?? false,
        apiKeyWritable: credential?.writable ?? true,
      })
    } catch {
      return
    }
  }

  private apiKeyRef(): string {
    const declared = this.scope.getSnapshot().value?.apiKeyEnv?.trim()
    return declared === undefined || declared === '' ? DEFAULT_API_KEY_REF : declared
  }

  private publish(next: VoiceModelSettingsSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}

/** Reject malformed remote settings snapshots before they reach the switch. */
export function decodeVoiceModelSettings(value: unknown): VoiceModelSettingsValue | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const model = (value as Record<string, unknown>).model
  if (!isRealtimeVoiceModel(model)) return undefined
  const rawTurnDetection = (value as Record<string, unknown>).turnDetection
  const turnDetection = rawTurnDetection === undefined
    ? DEFAULT_REALTIME_VOICE_TURN_DETECTION
    : rawTurnDetection
  if (!isRealtimeVoiceTurnDetection(turnDetection)) return undefined
  const apiKeyEnv = (value as Record<string, unknown>).apiKeyEnv
  if (apiKeyEnv !== undefined && (typeof apiKeyEnv !== 'string' || apiKeyEnv.trim() === '')) return undefined
  const rawProgressReporting = (value as Record<string, unknown>).progressReporting
  const progressReporting = rawProgressReporting === undefined
    ? DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING
    : rawProgressReporting
  if (!isRealtimeVoiceProgressReporting(progressReporting)) return undefined
  const progressMinIntervalMs = optionalBoundedInteger(
    (value as Record<string, unknown>).progressMinIntervalMs,
    DEFAULT_PROGRESS_MIN_INTERVAL_MS,
  )
  const progressQuietTaskMs = optionalBoundedInteger(
    (value as Record<string, unknown>).progressQuietTaskMs,
    DEFAULT_PROGRESS_QUIET_TASK_MS,
  )
  if (progressMinIntervalMs === undefined || progressQuietTaskMs === undefined) return undefined
  const rawVoice = (value as Record<string, unknown>).voice
  const voice = rawVoice === undefined ? DEFAULT_REALTIME_VOICE_VOICE : rawVoice
  if (!isRealtimeVoiceVoice(voice)) return undefined
  const vadThreshold = optionalBoundedNumber(
    (value as Record<string, unknown>).vadThreshold,
    DEFAULT_VAD_THRESHOLD,
    -1,
    1,
  )
  const silenceDurationMs = optionalBoundedInteger(
    (value as Record<string, unknown>).silenceDurationMs,
    DEFAULT_SILENCE_DURATION_MS,
    200,
    6_000,
  )
  const maxHistoryTurns = optionalBoundedInteger(
    (value as Record<string, unknown>).maxHistoryTurns,
    DEFAULT_MAX_HISTORY_TURNS,
    1,
    50,
  )
  if (vadThreshold === undefined || silenceDurationMs === undefined || maxHistoryTurns === undefined) return undefined
  const rawSpeechEmotion = (value as Record<string, unknown>).enableSpeechEmotion
  if (rawSpeechEmotion !== undefined && typeof rawSpeechEmotion !== 'boolean') return undefined
  const rawStylePrompt = (value as Record<string, unknown>).stylePrompt
  if (rawStylePrompt !== undefined
    && (typeof rawStylePrompt !== 'string' || rawStylePrompt.length > MAX_STYLE_PROMPT_LENGTH)) return undefined
  const rawHandoffSkill = (value as Record<string, unknown>).handoffSkill
  if (rawHandoffSkill !== undefined
    && (typeof rawHandoffSkill !== 'string' || rawHandoffSkill.length > MAX_HANDOFF_SKILL_LENGTH)) return undefined
  const rawHandoffInstructions = (value as Record<string, unknown>).handoffInstructions
  if (rawHandoffInstructions !== undefined
    && (typeof rawHandoffInstructions !== 'string'
      || rawHandoffInstructions.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH)) return undefined
  const rawRingDuration = (value as Record<string, unknown>).ringDurationMs
  if (rawRingDuration !== undefined
    && (typeof rawRingDuration !== 'number'
      || !Number.isInteger(rawRingDuration)
      || rawRingDuration < 0
      || rawRingDuration > 60_000)) return undefined
  return {
    model,
    turnDetection,
    voice,
    vadThreshold,
    silenceDurationMs,
    maxHistoryTurns,
    enableSpeechEmotion: rawSpeechEmotion ?? true,
    stylePrompt: rawStylePrompt ?? '',
    progressReporting,
    progressMinIntervalMs,
    progressQuietTaskMs,
    handoffSkill: rawHandoffSkill ?? '',
    handoffInstructions: rawHandoffInstructions ?? '',
    ringDurationMs: rawRingDuration ?? DEFAULT_RING_DURATION_MS,
    ...(typeof apiKeyEnv === 'string' ? { apiKeyEnv } : {}),
  }
}

function optionalBoundedInteger(
  value: unknown,
  fallback: number,
  min = 0,
  max = 600_000,
): number | undefined {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return undefined
  return value
}

/**
 * The field accepts either a DSH skill name (kebab-case, no separators) or a
 * path to a markdown file. Anything else is rejected before the write rather
 * than silently producing guidance that can never resolve.
 */
function isHandoffSkillOrPath(value: string): boolean {
  if (/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value)) return true
  if (value.includes('\0') || value.length > MAX_HANDOFF_SKILL_LENGTH) return false
  // A path needs at least one separator or a file extension, otherwise a typo
  // like "my skill" would be stored and only fail later during a handoff.
  return value.includes('/') || value.includes('\\') || value.startsWith('~')
}

function optionalBoundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return undefined
  return value
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
