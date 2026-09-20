/** Realtime voice models supported by the built-in DashScope provider. */
export const REALTIME_VOICE_MODELS = {
  flash: 'qwen-audio-3.0-realtime-flash',
  plus: 'qwen-audio-3.0-realtime-plus',
} as const

export type RealtimeVoiceModel = typeof REALTIME_VOICE_MODELS[keyof typeof REALTIME_VOICE_MODELS]

export const REALTIME_VOICE_TURN_DETECTION = {
  fast: 'server_vad',
  semantic: 'smart_turn',
  semanticV2: 'smart_turn_v2',
} as const

export type RealtimeVoiceTurnDetection =
  typeof REALTIME_VOICE_TURN_DETECTION[keyof typeof REALTIME_VOICE_TURN_DETECTION]

/** Ordered for the settings card; the service rejects anything outside this set. */
export const REALTIME_VOICE_TURN_DETECTION_MODES: readonly RealtimeVoiceTurnDetection[] = [
  REALTIME_VOICE_TURN_DETECTION.fast,
  REALTIME_VOICE_TURN_DETECTION.semantic,
  REALTIME_VOICE_TURN_DETECTION.semanticV2,
]

/**
 * The exact voice list returned by the service when an unsupported id is sent.
 * Ordering is preserved so the first entry stays the documented default.
 */
export const REALTIME_VOICE_VOICES = [
  'longanqian',
  'longanlingxin',
  'longanlufeng',
  'longanlingxi',
  'longanxiaoxin',
  'longanfengyue',
  'longanyuanfei',
  'longanhuan_v3.6',
  'longjielidou_v3.6',
  'longpaopao_v3.6',
  'longhuohuo_v3.6',
  'longchuanshu_v3.6',
  'loongmary',
  'loongeva_v3.6',
  'loongjohn',
  'daniel',
  'echo',
  'hannah',
  'sherry',
] as const

export type RealtimeVoiceVoice = typeof REALTIME_VOICE_VOICES[number]

/** How much of the DSH Agent's stage-by-stage progress may reach the live call. */
export const REALTIME_VOICE_PROGRESS_REPORTING = {
  keyOnly: 'key-only',
  silent: 'silent',
  all: 'all',
} as const

export type RealtimeVoiceProgressReporting =
  typeof REALTIME_VOICE_PROGRESS_REPORTING[keyof typeof REALTIME_VOICE_PROGRESS_REPORTING]

/**
 * Name of the reporting/planning skill the plugin ships with. A project skill
 * under the same name outranks it, so an operator can shadow the default
 * without touching plugin internals. Shared by the Host default and the
 * settings card so both surfaces agree on one value.
 */
export const DEFAULT_HANDOFF_SKILL_NAME = 'dsh-voice-supervisor'

/** Default ring length for an incoming report, in milliseconds. */
export const DEFAULT_RING_DURATION_MS = 5_000

export const DEFAULT_REALTIME_VOICE_MODEL: RealtimeVoiceModel = REALTIME_VOICE_MODELS.plus
export const DEFAULT_REALTIME_VOICE_TURN_DETECTION: RealtimeVoiceTurnDetection = REALTIME_VOICE_TURN_DETECTION.fast
export const DEFAULT_REALTIME_VOICE_VOICE: RealtimeVoiceVoice = 'longanqian'
export const DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING: RealtimeVoiceProgressReporting =
  REALTIME_VOICE_PROGRESS_REPORTING.keyOnly
export const REALTIME_VOICE_SETTINGS_NAMESPACE = 'realtime-voice' as const

export function isRealtimeVoiceModel(value: unknown): value is RealtimeVoiceModel {
  return value === REALTIME_VOICE_MODELS.flash || value === REALTIME_VOICE_MODELS.plus
}

export function isRealtimeVoiceTurnDetection(value: unknown): value is RealtimeVoiceTurnDetection {
  return REALTIME_VOICE_TURN_DETECTION_MODES.includes(value as RealtimeVoiceTurnDetection)
}

export function isRealtimeVoiceVoice(value: unknown): value is RealtimeVoiceVoice {
  return REALTIME_VOICE_VOICES.includes(value as RealtimeVoiceVoice)
}

/** Friendly names for the built-in voices; unknown ids stay verbatim. */
const REALTIME_VOICE_VOICE_LABELS: Record<RealtimeVoiceVoice, string> = {
  longanqian: '龙安·芊（默认）',
  longanlingxin: '龙安·灵心',
  longanlufeng: '龙安·陆风',
  longanlingxi: '龙安·灵犀',
  longanxiaoxin: '龙安·小欣',
  longanfengyue: '龙安·风月',
  longanyuanfei: '龙安·远飞',
  'longanhuan_v3.6': '龙安·欢 v3.6',
  'longjielidou_v3.6': '龙杰·栗豆 v3.6',
  'longpaopao_v3.6': '龙·泡泡 v3.6',
  'longhuohuo_v3.6': '龙·火火 v3.6',
  'longchuanshu_v3.6': '龙·川蜀 v3.6',
  loongmary: 'Loong Mary',
  'loongeva_v3.6': 'Loong Eva v3.6',
  loongjohn: 'Loong John',
  daniel: 'Daniel',
  echo: 'Echo',
  hannah: 'Hannah',
  sherry: 'Sherry',
}

export function realtimeVoiceVoiceLabel(voice: string | undefined): string {
  if (voice === undefined) return '未知音色'
  return isRealtimeVoiceVoice(voice) ? REALTIME_VOICE_VOICE_LABELS[voice] : voice
}

export function isRealtimeVoiceProgressReporting(value: unknown): value is RealtimeVoiceProgressReporting {
  return value === REALTIME_VOICE_PROGRESS_REPORTING.keyOnly
    || value === REALTIME_VOICE_PROGRESS_REPORTING.silent
    || value === REALTIME_VOICE_PROGRESS_REPORTING.all
}

export function realtimeVoiceModelLabel(model: string | undefined): string {
  if (model === REALTIME_VOICE_MODELS.flash) return 'Flash · 经济低延迟'
  if (model === REALTIME_VOICE_MODELS.plus) return 'Plus · 高质量'
  return model ?? '未知模型'
}

export function realtimeVoiceTurnDetectionLabel(mode: string | undefined): string {
  if (mode === REALTIME_VOICE_TURN_DETECTION.fast) return '快速声学打断'
  if (mode === REALTIME_VOICE_TURN_DETECTION.semanticV2) return '智能语义轮次 v2'
  if (mode === REALTIME_VOICE_TURN_DETECTION.semantic) return '智能语义轮次'
  return mode ?? '未知打断模式'
}

export function realtimeVoiceProgressReportingLabel(mode: string | undefined): string {
  if (mode === REALTIME_VOICE_PROGRESS_REPORTING.keyOnly) return '仅关键节点'
  if (mode === REALTIME_VOICE_PROGRESS_REPORTING.silent) return '不播报进度'
  if (mode === REALTIME_VOICE_PROGRESS_REPORTING.all) return '全部播报'
  return mode ?? '未知播报粒度'
}
