import type { HostObservable, InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { useState } from 'react'
import {
  REALTIME_VOICE_MODELS,
  REALTIME_VOICE_PROGRESS_REPORTING,
  REALTIME_VOICE_TURN_DETECTION,
  REALTIME_VOICE_VOICES,
  realtimeVoiceVoiceLabel,
  type RealtimeVoiceModel,
  type RealtimeVoiceProgressReporting,
  type RealtimeVoiceTurnDetection,
  type RealtimeVoiceVoice,
} from '../models.ts'
import type { VoiceModelSettingsSnapshot } from './model-settings.ts'
import styles from './voice.module.css'

export interface VoiceSettingsCardInjected {
  hooks: { voiceModelSettings: HostObservable<VoiceModelSettingsSnapshot> }
  selectModel: (model: RealtimeVoiceModel) => void
  selectTurnDetection: (mode: RealtimeVoiceTurnDetection) => void
  selectVoice: (voice: RealtimeVoiceVoice) => void
  setVadThreshold: (value: number) => void
  setSilenceDuration: (value: number) => void
  setMaxHistoryTurns: (value: number) => void
  setSpeechEmotion: (value: boolean) => void
  setStylePrompt: (value: string) => void
  selectProgressReporting: (mode: RealtimeVoiceProgressReporting) => void
  setProgressMinInterval: (value: number) => void
  setProgressQuietTask: (value: number) => void
  setHandoffSkill: (value: string) => void
  setHandoffInstructions: (value: string) => void
  setRingDuration: (value: number) => void
  saveApiKey: (value: string) => Promise<boolean>
}

export type VoiceSettingsCardProps =
  PropsRuntime<'settings.plugin.item'> & InjectFace<VoiceSettingsCardInjected>

/** One native Plugins-settings card. Changes persist immediately and affect the next call. */
export function VoiceSettingsCard({
  useVoiceModelSettings,
  selectModel,
  selectTurnDetection,
  selectVoice,
  setVadThreshold,
  setSilenceDuration,
  setMaxHistoryTurns,
  setSpeechEmotion,
  setStylePrompt,
  selectProgressReporting,
  setProgressMinInterval,
  setProgressQuietTask,
  setHandoffSkill,
  setHandoffInstructions,
  setRingDuration,
  saveApiKey,
}: VoiceSettingsCardProps) {
  const state = useVoiceModelSettings(snapshot => snapshot)
  const [apiKey, setApiKey] = useState('')
  if (!state.available) return null
  const disabled = !state.writable || state.saving
  return (
    <li className={styles.settingsCard}>
      <div className={styles.settingsCardHeader}>
        <span className={styles.settingsCardIcon} aria-hidden><WaveGlyph /></span>
        <span className={styles.settingsCardHeading}>
          <strong>DSH 实时语音</strong>
          <span>选择语音理解、全双工通话和工具调度使用的百炼模型。</span>
        </span>
      </div>
      <div className={styles.settingsCardBody}>
        <div className={styles.settingsLabel}>实时语音模型</div>
        <div className={styles.modelSwitch} role="radiogroup" aria-label="实时语音模型">
          <ModelChoice
            title="Flash"
            detail="经济 · 低延迟 · 推荐日常使用"
            selected={state.model === REALTIME_VOICE_MODELS.flash}
            disabled={disabled}
            onClick={() => selectModel(REALTIME_VOICE_MODELS.flash)}
          />
          <ModelChoice
            title="Plus"
            detail="高质量 · 成本更高"
            selected={state.model === REALTIME_VOICE_MODELS.plus}
            disabled={disabled}
            onClick={() => selectModel(REALTIME_VOICE_MODELS.plus)}
          />
        </div>
        <p className={styles.settingsHint}>
          {state.saving ? '正在保存…' : '设置即时保存，从下一通电话开始生效；不会中断正在进行的通话。'}
        </p>
        <div className={styles.settingsSubsection}>
          <div className={styles.settingsLabel}>VAD 打断方式</div>
          <div className={styles.modelSwitchThree} role="radiogroup" aria-label="VAD 打断方式">
            <ModelChoice
              title="快速打断"
              detail="纯声学 VAD · 最快"
              selected={state.turnDetection === REALTIME_VOICE_TURN_DETECTION.fast}
              disabled={disabled}
              onClick={() => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.fast)}
            />
            <ModelChoice
              title="智能轮次"
              detail="声学＋语义 · 过滤附和"
              selected={state.turnDetection === REALTIME_VOICE_TURN_DETECTION.semantic}
              disabled={disabled}
              onClick={() => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.semantic)}
            />
            <ModelChoice
              title="智能轮次 v2"
              detail="新版语义判轮 · 推荐"
              selected={state.turnDetection === REALTIME_VOICE_TURN_DETECTION.semanticV2}
              disabled={disabled}
              onClick={() => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.semanticV2)}
            />
          </div>
          <p className={styles.settingsHint}>
            智能轮次会忽略“嗯、啊”等无意义声音，不触发对话轮；v2 是新版判轮策略。
            快速打断会在检测到你开口后立即清空本地播报，并取消云端旧响应。
          </p>
        </div>
        <div className={styles.settingsSubsection}>
          <div className={styles.settingsLabel}>音色与通话参数</div>
          <label className={styles.selectField}>
            <span className={styles.numberFieldLabel}>播报音色</span>
            <select
              className={styles.selectInput}
              value={state.voice}
              disabled={disabled}
              onChange={event => selectVoice(event.target.value as RealtimeVoiceVoice)}
            >
              {REALTIME_VOICE_VOICES.map(voice => (
                <option key={voice} value={voice}>{realtimeVoiceVoiceLabel(voice)}</option>
              ))}
            </select>
          </label>
          <p className={styles.settingsHint}>
            音色只能在建立连接时设置一次；已进行的通话不受影响。
          </p>
          <div className={styles.numberRow}>
            <NumberField
              label="VAD 灵敏度（-1 ~ 1）"
              suffix=""
              step={0.05}
              toDisplay={value => String(value)}
              toValue={value => Math.round(value * 100) / 100}
              value={state.vadThreshold}
              disabled={disabled || state.turnDetection !== REALTIME_VOICE_TURN_DETECTION.fast}
              commit={value => setVadThreshold(value)}
            />
            <NumberField
              label="静音判停"
              suffix="毫秒"
              step={50}
              toDisplay={value => String(value)}
              toValue={value => Math.round(value)}
              value={state.silenceDurationMs}
              disabled={disabled || state.turnDetection !== REALTIME_VOICE_TURN_DETECTION.fast}
              commit={value => setSilenceDuration(value)}
            />
          </div>
          <p className={styles.settingsHint}>
            VAD 灵敏度与静音判停只在“快速打断”模式下生效，建议静音判停 400–800 毫秒。
          </p>
          <div className={styles.numberRow}>
            <NumberField
              label="上下文历史轮数（1 ~ 50）"
              suffix="轮"
              step={1}
              toDisplay={value => String(value)}
              toValue={value => Math.round(value)}
              value={state.maxHistoryTurns}
              disabled={disabled}
              commit={value => setMaxHistoryTurns(value)}
            />
            <label className={styles.numberField}>
              <span className={styles.numberFieldLabel}>情绪增强</span>
              <span className={styles.toggleRow}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.enableSpeechEmotion}
                  className={`${styles.toggle} ${state.enableSpeechEmotion ? styles.toggleOn : ''}`}
                  disabled={disabled}
                  onClick={() => setSpeechEmotion(!state.enableSpeechEmotion)}
                >
                  <span className={styles.toggleKnob} aria-hidden />
                </button>
                <span className={styles.toggleCaption}>{state.enableSpeechEmotion ? '开启' : '关闭'}</span>
              </span>
            </label>
          </div>
          <StylePromptField
            value={state.stylePrompt}
            disabled={disabled}
            commit={value => setStylePrompt(value)}
          />
        </div>
        <div className={styles.settingsSubsection}>
          <div className={styles.settingsLabel}>进度播报</div>
          <div className={styles.modelSwitchThree} role="radiogroup" aria-label="进度播报粒度">
            <ModelChoice
              title="仅关键节点"
              detail="长任务每 45 秒最多一句 · 推荐"
              selected={state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.keyOnly}
              disabled={disabled}
              onClick={() => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.keyOnly)}
            />
            <ModelChoice
              title="不播报进度"
              detail="只在需要你决定或完成时开口"
              selected={state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent}
              disabled={disabled}
              onClick={() => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.silent)}
            />
            <ModelChoice
              title="全部播报"
              detail="每个执行阶段都同步一句"
              selected={state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.all}
              disabled={disabled}
              onClick={() => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.all)}
            />
          </div>
          <p className={styles.settingsHint}>
            只影响执行过程中的阶段话术。审批、提问、失败和最终结果始终会播报。
          </p>
          {state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.all ? null : (
            <div className={styles.numberRow}>
              <NumberField
                label="最小播报间隔"
                suffix="秒"
                value={state.progressMinIntervalMs}
                disabled={disabled || state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent}
                commit={value => setProgressMinInterval(value)}
              />
              <NumberField
                label="短任务静默阈值"
                suffix="秒"
                value={state.progressQuietTaskMs}
                disabled={disabled || state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent}
                commit={value => setProgressQuietTask(value)}
              />
            </div>
          )}
        </div>
        <div className={styles.settingsSubsection}>
          <div className={styles.settingsLabel}>执行 Agent 汇报指导</div>
          <SkillNameField
            value={state.handoffSkill}
            disabled={disabled}
            commit={value => setHandoffSkill(value)}
          />
          <p className={styles.settingsHint}>
            可留空。填 DSH Skill 名（如 <code>dsh-voice-supervisor</code>），或填一个 markdown 文件的绝对路径
            （如 <code>~/my-skill/SKILL.md</code>，支持 <code>~</code>）。每次把任务交给执行 Agent 时，
            这段正文会随任务一起下发，用来规定它怎么汇报进展、先看什么、怎么安排工作。
            插件内置了 <code>dsh-voice-supervisor</code> 范本，但默认不启用；想用就填它的名字。
          </p>
          <HandoffInstructionsField
            value={state.handoffInstructions}
            disabled={disabled}
            commit={value => setHandoffInstructions(value)}
          />
          <p className={styles.settingsHint}>
            临时补充的汇报要求，追加在 Skill 正文之后，适合这次不想改 Skill 的微调。
            它只影响汇报与规划，不覆盖你的指令、会话权限或工具结果。
          </p>
        </div>
        <div className={styles.settingsSubsection}>
          <div className={styles.settingsLabel}>回拨振铃</div>
          <div className={styles.numberRow}>
            <NumberField
              label="响铃时长（0 表示不响）"
              suffix="秒"
              value={state.ringDurationMs}
              disabled={disabled}
              commit={value => setRingDuration(value)}
            />
          </div>
          <p className={styles.settingsHint}>
            任务完成后的来电提示音时长，最多 60 秒。无论响铃多久，任务都会留在回拨列表里，随时可以再接听。
          </p>
        </div>
        {state.error === undefined ? null : <p className={styles.settingsError} role="alert">{state.error}</p>}
        {state.writable ? null : <p className={styles.settingsHint}>当前连接不能修改主机设置，请在本机 3080 WebUI 中操作。</p>}
        <div className={styles.credentialSection}>
          <div className={styles.settingsLabel}>阿里云百炼 API Key</div>
          <div className={styles.credentialStatus} data-configured={state.apiKeyConfigured || undefined}>
            <span className={styles.credentialDot} />
            {state.apiKeyConfigured
              ? `已自动检测到 ${state.apiKeyRef}（环境变量或 DSH 凭据）`
              : `未检测到 ${state.apiKeyRef}`}
          </div>
          <div className={styles.credentialInputRow}>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              className={styles.credentialInput}
              value={apiKey}
              placeholder={state.apiKeyConfigured ? '输入新 Key 可安全替换' : 'sk-…'}
              aria-label="阿里云百炼 API Key"
              disabled={!state.apiKeyWritable || state.apiKeySaving}
              onChange={event => setApiKey(event.target.value)}
            />
            <button
              type="button"
              className={styles.credentialSave}
              disabled={!state.apiKeyWritable || state.apiKeySaving || apiKey.trim() === ''}
              onClick={() => {
                void saveApiKey(apiKey).then(saved => { if (saved) setApiKey('') })
              }}
            >{state.apiKeySaving ? '保存中…' : '保存 Key'}</button>
          </div>
          <p className={styles.settingsHint}>密钥通过 DSH 官方 credentials 写入，只能检查是否存在，浏览器无法回读明文。</p>
          {state.apiKeyError === undefined ? null : <p className={styles.settingsError} role="alert">{state.apiKeyError}</p>}
        </div>
      </div>
    </li>
  )
}

function NumberField(props: {
  label: string
  suffix: string
  value: number
  disabled: boolean
  step?: number
  /** Presentation only; defaults to whole seconds. */
  toDisplay?: (value: number) => string
  toValue?: (display: number) => number
  commit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const display = props.toDisplay ?? (value => String(Math.round(value / 1_000)))
  const toValue = props.toValue ?? (value => Math.round(value * 1_000))
  const shown = draft ?? display(props.value)
  const commit = () => {
    const parsed = Number(shown)
    setDraft(undefined)
    if (!Number.isFinite(parsed)) return
    props.commit(toValue(parsed))
  }
  return (
    <label className={styles.numberField}>
      <span className={styles.numberFieldLabel}>{props.label}</span>
      <span className={styles.numberFieldInput}>
        <input
          type="number"
          step={props.step ?? 1}
          inputMode="numeric"
          className={styles.numberInput}
          value={shown}
          disabled={props.disabled}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => { if (event.key === 'Enter') commit() }}
        />
        <span className={styles.numberSuffix}>{props.suffix}</span>
      </span>
    </label>
  )
}

function StylePromptField(props: {
  value: string
  disabled: boolean
  commit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const shown = draft ?? props.value
  const commit = () => {
    if (draft === undefined) return
    setDraft(undefined)
    if (draft.trim() !== props.value) props.commit(draft)
  }
  return (
    <label className={styles.styleField}>
      <span className={styles.numberFieldLabel}>说话风格 / 人设（可留空）</span>
      <textarea
        className={styles.styleInput}
        rows={3}
        maxLength={2_000}
        spellCheck={false}
        placeholder="例如：语速偏慢，称呼我为“老板”，每次回答不超过两句。"
        value={shown}
        disabled={props.disabled}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
      />
      <span className={styles.settingsHint}>
        只影响语气、称呼和长短，不会改变工具调用、审批与终态规则；从下一通电话开始生效。
      </span>
    </label>
  )
}

function SkillNameField(props: {
  value: string
  disabled: boolean
  commit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const shown = draft ?? props.value
  const commit = () => {
    if (draft === undefined) return
    setDraft(undefined)
    if (draft.trim() !== props.value) props.commit(draft)
  }
  return (
    <label className={styles.numberField}>
      <span className={styles.numberFieldLabel}>汇报 Skill 名称或文件路径（可留空）</span>
      <span className={styles.numberFieldInput}>
        <input
          type="text"
          className={styles.numberInput}
          spellCheck={false}
          autoComplete="off"
          maxLength={512}
          placeholder="dsh-voice-supervisor 或 ~/my-skill/SKILL.md"
          value={shown}
          disabled={props.disabled}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => { if (event.key === 'Enter') commit() }}
        />
      </span>
    </label>
  )
}

function HandoffInstructionsField(props: {
  value: string
  disabled: boolean
  commit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const shown = draft ?? props.value
  const commit = () => {
    if (draft === undefined) return
    setDraft(undefined)
    if (draft.trim() !== props.value) props.commit(draft)
  }
  return (
    <label className={styles.styleField}>
      <span className={styles.numberFieldLabel}>补充汇报指令（可留空）</span>
      <textarea
        className={styles.styleInput}
        rows={4}
        maxLength={8_000}
        spellCheck={false}
        placeholder="例如：先给我一句话结论；只汇报影响我决策的进展；改动的文件用中文列名字。"
        value={shown}
        disabled={props.disabled}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
      />
    </label>
  )
}

function ModelChoice(props: {
  title: string
  detail: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      className={`${styles.modelChoice} ${props.selected ? styles.modelChoiceSelected : ''}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <span className={styles.modelChoiceTitle}>{props.title}</span>
      <span className={styles.modelChoiceDetail}>{props.detail}</span>
      <span className={styles.radioDot} aria-hidden />
    </button>
  )
}

function WaveGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon}>
      <path d="M4 13v-2M8 16V8M12 19V5M16 16V8M20 13v-2" />
    </svg>
  )
}
