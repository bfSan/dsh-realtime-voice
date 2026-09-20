import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_REALTIME_VOICE_MODEL,
  DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING,
  DEFAULT_REALTIME_VOICE_TURN_DETECTION,
  DEFAULT_REALTIME_VOICE_VOICE,
  REALTIME_VOICE_MODELS,
  REALTIME_VOICE_PROGRESS_REPORTING,
  REALTIME_VOICE_TURN_DETECTION,
  REALTIME_VOICE_TURN_DETECTION_MODES,
  REALTIME_VOICE_VOICES,
  type RealtimeVoiceModel,
  type RealtimeVoiceProgressReporting,
  type RealtimeVoiceTurnDetection,
  type RealtimeVoiceVoice,
} from '../models.ts'
import { DEFAULT_RING_DURATION_MS } from '../models.ts'

/** Host-side realtime voice configuration; secrets are references, never values. */
export interface VoiceConfig {
  endpoint: string
  temporaryKeyEndpoint: string
  temporaryKeyTtlSeconds: number
  apiKeyEnv: string
  model: RealtimeVoiceModel
  voice: RealtimeVoiceVoice
  turnDetection: RealtimeVoiceTurnDetection
  vadThreshold: number
  silenceDurationMs: number
  maxHistoryTurns: number
  enableSpeechEmotion: boolean
  progressReporting: RealtimeVoiceProgressReporting
  progressMinIntervalMs: number
  progressQuietTaskMs: number
  /** User-authored speaking style; appended to the built-in guard rails. */
  stylePrompt: string
  /**
   * Where the reporting guidance comes from: either a DSH skill name, or a
   * path to a markdown file. Empty means no skill guidance at all - the
   * built-in `dsh-voice-supervisor` skill stays available for anyone who
   * wants it, but nothing is attached unless the operator asks for it.
   */
  handoffSkill: string
  /** Ad-hoc rules appended after the configured skill body. */
  handoffInstructions: string
  supervisorSkill: string
  supervisorInstructions: string
  /**
   * How long an incoming report rings before falling silent. The report stays
   * in the call-back list either way; zero disables the sound entirely.
   */
  ringDurationMs: number
  maxConnections: number
  maxBinaryFrameBytes: number
  connectTimeoutMs: number
}

export const Config: z<VoiceConfig> = z.object({
  endpoint: z.string().default('wss://dashscope.aliyuncs.com/api-ws/v1/realtime'),
  temporaryKeyEndpoint: z.string().default('https://dashscope.aliyuncs.com/api/v1/tokens'),
  temporaryKeyTtlSeconds: z.natural().min(1).max(120).default(60),
  apiKeyEnv: z.string().default('DASHSCOPE_API_KEY'),
  model: z.union([REALTIME_VOICE_MODELS.flash, REALTIME_VOICE_MODELS.plus]).default(DEFAULT_REALTIME_VOICE_MODEL),
  voice: z.union(REALTIME_VOICE_VOICES).default(DEFAULT_REALTIME_VOICE_VOICE),
  turnDetection: z.union(REALTIME_VOICE_TURN_DETECTION_MODES).default(DEFAULT_REALTIME_VOICE_TURN_DETECTION),
  vadThreshold: z.number().min(-1).max(1).default(0.35),
  silenceDurationMs: z.natural().min(200).max(6000).default(500),
  maxHistoryTurns: z.natural().min(1).max(50).default(20),
  enableSpeechEmotion: z.boolean().default(true),
  progressReporting: z.union([
    REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
    REALTIME_VOICE_PROGRESS_REPORTING.silent,
    REALTIME_VOICE_PROGRESS_REPORTING.all,
  ]).default(DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING),
  progressMinIntervalMs: z.natural().min(0).max(600_000).default(45_000),
  progressQuietTaskMs: z.natural().min(0).max(600_000).default(20_000),
  stylePrompt: z.string().default(''),
  handoffSkill: z.string().default(''),
  handoffInstructions: z.string().default(''),
  supervisorSkill: z.string().default(''),
  supervisorInstructions: z.string().default(''),
  ringDurationMs: z.natural().min(0).max(60_000).default(DEFAULT_RING_DURATION_MS),
  maxConnections: z.natural().min(1).max(32).default(4),
  maxBinaryFrameBytes: z.natural().min(1024).max(1024 * 1024).default(64 * 1024),
  connectTimeoutMs: z.natural().min(1000).max(60_000).default(15_000),
})
