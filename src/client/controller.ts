import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import {
  AUDIO_CHANNELS,
  AudioFrameKind,
  decodeAudioFrame,
  encodeAudioFrame,
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  VOICE_PROTOCOL,
  VOICE_ROUTE,
  VOICE_INBOX_ROUTE,
  VOICE_STATUS_ROUTE,
  VOICE_WEB_CLIENT_VERSION,
  type VoiceApproval,
  type VoiceInboxEntry,
  type VoiceInboxSnapshot,
  type VoicePhase,
  type VoiceQuestion,
  type VoiceQuestionAnswer,
  type VoiceOccupancyStatus,
  type VoiceServerControl,
} from '../protocol.ts'
import { VOICE_BUTLER_ROUTE } from '../supervisor-protocol.ts'
import { BrowserAudioEngine } from './audio-engine.ts'

export type ClientVoicePhase = 'idle' | 'requesting-permission' | VoicePhase | 'error'

export interface VoiceSnapshot {
  supervisor?: boolean
  phase: ClientVoicePhase
  sessionId?: string
  /** Which butler answered this call, when the call is an independent one. */
  butlerId?: string
  voiceSessionId?: string
  muted: boolean
  userTranscript: string
  assistantTranscript: string
  agentRunning: boolean
  agentSummary?: string
  pendingApproval?: VoiceApproval
  pendingQuestion?: VoiceQuestion
  providerModel?: string
  turnDetection?: 'server_vad' | 'smart_turn' | 'smart_turn_v2'
  elapsedSeconds: number
  occupancy?: VoiceOccupancyStatus
  /** Finished handoffs waiting to be reported back by voice. */
  inbox: readonly VoiceInboxEntry[]
  /** IDs the user checked in the call-back list, in selection order. */
  inboxSelection: readonly string[]
  /** IDs the user deferred: still listed, but no longer ringing. */
  snoozedInbox: readonly string[]
  error?: string | undefined
}

const INITIAL_SNAPSHOT: VoiceSnapshot = {
  phase: 'idle',
  muted: false,
  userTranscript: '',
  assistantTranscript: '',
  agentRunning: false,
  elapsedSeconds: 0,
  inbox: [],
  inboxSelection: [],
  snoozedInbox: [],
}

/** Root-lifetime call controller shared by the session button and frame overlay through inject hooks. */
export class VoiceCallController implements HostObservable<VoiceSnapshot> {
  private supervisorMode = false
  private butlerId: string | undefined
  private readonly playbackFinalSequences = new Map<number, number>()
  private taskAction: { resolve(): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> } | undefined

  refreshButlers(): Promise<readonly { id: string; name: string }[]> {
    return fetch(VOICE_BUTLER_ROUTE, { cache: 'no-store' })
      .then(async response => response.ok ? await response.json() as { id: string; name: string }[] : [])
      .catch(() => [])
  }

  /** Roster snapshot for the launcher; refreshed whenever the panel needs it. */
  private roster: readonly { id: string; name: string }[] = []

  butlerRoster(): readonly { id: string; name: string }[] {
    if (this.roster.length === 0) void this.refreshButlers().then(rows => { this.roster = rows })
    return this.roster
  }

  private sendTaskAction(message: object): Promise<void> {
    if (this.taskAction) return Promise.reject(new Error('正在选择任务，请稍候'))
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.taskAction = undefined
        reject(new Error('选择任务超时，请检查连接后重试'))
      }, 15_000)
      this.taskAction = { resolve, reject, timer }
      this.socket?.send(JSON.stringify(message))
    })
  }

  private settleTaskAction(error?: string): void {
    const action = this.taskAction
    if (!action) return
    this.taskAction = undefined
    clearTimeout(action.timer)
    if (error) action.reject(new Error(error))
    else action.resolve()
  }

  async startSupervisor(): Promise<void> {
    if (this.snapshot.phase !== 'idle' && this.snapshot.phase !== 'error') return
    await this.start('voice-supervisor', true)
  }

  /** Call a named butler instead of the roster default. */
  async startButler(butlerId: string): Promise<void> {
    if (this.snapshot.phase !== 'idle' && this.snapshot.phase !== 'error') return
    this.butlerId = butlerId
    try {
      await this.start('voice-supervisor', true)
    } finally {
      this.butlerId = undefined
    }
  }

  async createButler(name: string): Promise<string> {
    const response = await fetch(VOICE_BUTLER_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error('新建语音总管失败，请稍后重试。')
    const created = await response.json() as { id: string }
    this.roster = await this.refreshButlers()
    return created.id
  }

  async selectTask(taskId: string): Promise<void> {
    if (!this.supervisorMode || !this.providerReady) throw new Error('请先接通总管电话')
    await this.sendTaskAction({ type: 'voice.select-task', taskId })
  }

  async createTask(workspace: string, presetId: string): Promise<void> {
    if (!this.supervisorMode || !this.providerReady) throw new Error('请先接通总管电话')
    await this.sendTaskAction({ type: 'voice.create-task', workspace, presetId, requestId: crypto.randomUUID() })
  }
  private snapshot: VoiceSnapshot = INITIAL_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private socket: WebSocket | undefined
  private audio: BrowserAudioEngine | undefined
  private inputSequence = 0
  private inputStreamId = 1
  private providerReady = false
  private startedAt = 0
  private timer: ReturnType<typeof setInterval> | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private reconnectAttempt = 0
  private connectionEpoch = 0
  private lastReconnectError: string | undefined
  private ending = false
  private presenceTimer: ReturnType<typeof setInterval> | undefined
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  private startEpoch = 0
  private presenceRequestSeq = 0
  private lastServerSeq = 0
  private lastOutputStreamId = 0
  private inboxRevision = 0
  private answeringInbox = false

  getSnapshot = (): VoiceSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  startPresence(): void {
    if (this.presenceTimer !== undefined) return
    void this.refreshPresence()
    this.presenceTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') void this.refreshPresence()
    }, 2_000)
  }

  toggleInboxSelection(entryId: string): void {
    const selected = this.snapshot.inboxSelection
    // Selection order is playback order, so a newly checked task goes last.
    const next = selected.includes(entryId)
      ? selected.filter(id => id !== entryId)
      : [...selected, entryId]
    this.update({ ...this.snapshot, inboxSelection: next })
  }

  selectAllInbox(): void {
    this.update({
      ...this.snapshot,
      inboxSelection: this.snapshot.inbox.filter(entry => !entry.delivered).map(entry => entry.id),
    })
  }

  clearInboxSelection(): void {
    this.update({ ...this.snapshot, inboxSelection: [] })
  }

  /**
   * Stop ringing for one report while leaving it in the list.
   *
   * Snooze stays local on purpose: the Host's `delivered` flag means "already
   * spoken", and a snoozed report has not been spoken, so pushing it to the
   * Host would lose the task rather than defer it.
   */
  snoozeInbox(entryId: string): void {
    this.update({
      ...this.snapshot,
      inboxSelection: this.snapshot.inboxSelection.filter(id => id !== entryId),
      snoozedInbox: this.snapshot.snoozedInbox.includes(entryId)
        ? this.snapshot.snoozedInbox
        : [...this.snapshot.snoozedInbox, entryId],
    })
    void fetch(`${VOICE_INBOX_ROUTE}?id=${encodeURIComponent(entryId)}`, { method: 'PATCH' })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`) })
      .catch(() => this.update({ ...this.snapshot, error: '稍后状态仅在当前窗口生效，保存失败。' }))
  }

  /** Take one report immediately, ignoring whatever else is selected. */
  async answerInboxOne(entryId: string): Promise<void> {
    if (this.answeringInbox) return
    const entry = this.snapshot.inbox.find(candidate => candidate.id === entryId)
    if (entry === undefined) return
    if (entry.requiresOriginalSession === true) {
      this.update({ ...this.snapshot, error: '此问题来自上次运行，请在原 DSH 任务中继续回答。' })
      return
    }
    this.answeringInbox = true
    try {
      await this.start(entry.sessionId)
      if (this.snapshot.phase === 'listening' || this.snapshot.phase === 'agent-working') {
        this.sendControl({ type: 'voice.inbox-deliver', entryIds: [entryId] })
        this.update({
          ...this.snapshot,
          inboxSelection: this.snapshot.inboxSelection.filter(id => id !== entryId),
        })
      }
    } finally { this.answeringInbox = false }
  }

  /**
   * Ring back: take the call up against the selected task's own session and
   * ask the Host to speak those results in selection order.
   */
  async answerInbox(sessionId?: string): Promise<void> {
    if (this.answeringInbox) return
    const selected = this.snapshot.inboxSelection.length > 0
      ? this.snapshot.inboxSelection
      : this.snapshot.inbox.filter(entry => !entry.delivered).slice(0, 1).map(entry => entry.id)
    if (selected.length === 0) return
    if (this.snapshot.inbox.some(entry => selected.includes(entry.id) && entry.requiresOriginalSession)) {
      this.update({ ...this.snapshot, error: '所选问题来自上次运行，请在原 DSH 任务中继续回答。' })
      return
    }
    const target = sessionId
      ?? this.snapshot.inbox.find(entry => entry.id === selected[0])?.sessionId
    if (target === undefined) return
    this.answeringInbox = true
    try {
      await this.start(target)
      if (this.snapshot.phase === 'listening' || this.snapshot.phase === 'agent-working') {
        this.sendControl({ type: 'voice.inbox-deliver', entryIds: [...selected] })
        this.update({ ...this.snapshot, inboxSelection: [] })
      }
    } finally { this.answeringInbox = false }
  }

  /** Keep the task in the list but stop offering it as a call to take. */
  async dismissInbox(entryIds: readonly string[]): Promise<void> {
    if (entryIds.length === 0) return
    this.inboxRevision += 1
    try {
      const query = entryIds.map(id => `id=${encodeURIComponent(id)}`).join('&')
      const response = await fetch(`${VOICE_INBOX_ROUTE}?${query}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      this.inboxRevision += 1
      this.update({
        ...this.snapshot,
        error: undefined,
        inbox: this.snapshot.inbox.filter(entry => !entryIds.includes(entry.id)),
        inboxSelection: this.snapshot.inboxSelection.filter(id => !entryIds.includes(id)),
        snoozedInbox: this.snapshot.snoozedInbox.filter(id => !entryIds.includes(id)),
      })
    } catch (error) {
      this.update({ ...this.snapshot, error: `标记已读失败，条目已保留：${String(error)}` })
    }
  }

  async start(sessionId: string, supervisor = false): Promise<void> {
    if (this.snapshot.phase !== 'idle' && this.snapshot.phase !== 'error') return
    this.supervisorMode = supervisor
    const resumeContext = localResumeContext(this.snapshot)
    const targetSessionId = resumeContext?.sessionId ?? sessionId
    if (!window.isSecureContext || navigator.mediaDevices?.getUserMedia === undefined) {
      this.update({
        ...INITIAL_SNAPSHOT,
        ...resumeContext,
        phase: 'error',
        error: '实时语音需要安全上下文：请使用 localhost 或 HTTPS。',
      })
      return
    }
    const startEpoch = ++this.startEpoch
    this.ending = false
    this.update({ ...INITIAL_SNAPSHOT, ...resumeContext, phase: 'connecting', sessionId: targetSessionId })
    const occupancy = await this.refreshPresence()
    if (startEpoch !== this.startEpoch || this.ending) return
    // Public presence deliberately cannot identify the owner. A locally held
    // resume capability is presented to Host; voice.ready/busy is authoritative.
    if (occupancy?.active && resumeContext === undefined) {
      this.update({
        ...INITIAL_SNAPSHOT,
        occupancy,
        phase: 'error',
        error: busyMessage(occupancy),
      })
      return
    }
    this.reconnectAttempt = 0
    this.lastReconnectError = undefined
    this.update({
      ...INITIAL_SNAPSHOT,
      ...resumeContext,
      phase: 'requesting-permission',
      sessionId: targetSessionId,
      ...(occupancy === undefined ? {} : { occupancy }),
    })
    try {
      const audio = new BrowserAudioEngine(
        pcm => this.sendAudio(pcm),
        () => this.handleLocalSpeechStart(),
        streamId => {
          const lastSequence = this.playbackFinalSequences.get(streamId)
          this.sendControl({ type: 'voice.playback-drained', streamId, ...(lastSequence === undefined ? {} : { lastSequence }) })
        },
      )
      this.audio = audio
      await audio.start()
      this.startedAt = Date.now()
      this.timer = setInterval(() => this.tick(), 1000)
      await this.connect(targetSessionId)
    } catch (error) {
      if (this.ending) return
      const message = error instanceof Error ? error.message : String(error)
      if (this.reconnectTimer !== undefined) {
        this.update({ ...this.snapshot, error: message })
      } else {
        await this.fail(message, resumeContext !== undefined)
      }
    }
  }

  async end(): Promise<void> {
    if (this.snapshot.phase === 'idle') return
    this.ending = true
    this.settleTaskAction('通话已结束')
    this.update({ ...this.snapshot, phase: 'ending' })
    this.sendControl({ type: 'voice.end', reason: 'user-ended' })
    await this.cleanup()
    this.resetCallCursors()
    this.update(INITIAL_SNAPSHOT)
  }

  toggleMute(): void {
    const muted = !this.snapshot.muted
    this.audio?.setMuted(muted)
    this.update({ ...this.snapshot, muted })
  }

  cancelResponse(): void {
    this.audio?.interruptPlayback()
    this.sendControl({ type: 'voice.cancel-response', source: 'user' })
  }

  answerApproval(approvalId: string, outcome: 'allowed-once' | 'rejected'): void {
    if (this.snapshot.pendingApproval?.approvalId !== approvalId) return
    this.sendControl({ type: 'voice.approval-answer', approvalId, outcome })
  }

  answerQuestion(requestId: string, answers: VoiceQuestionAnswer[]): void {
    if (this.snapshot.pendingQuestion?.requestId !== requestId || answers.length === 0) return
    this.sendControl({ type: 'voice.question-answer', requestId, answers })
  }

  async dispose(): Promise<void> {
    this.ending = true
    this.settleTaskAction('语音组件已关闭')
    if (this.presenceTimer !== undefined) clearInterval(this.presenceTimer)
    this.presenceTimer = undefined
    await this.cleanup()
    this.listeners.clear()
  }

  private async connect(sessionId: string): Promise<void> {
    const epoch = ++this.connectionEpoch
    const previous = this.socket
    this.socket = undefined
    if (previous !== undefined && previous.readyState < WebSocket.CLOSING) {
      previous.close(1000, 'voice-connection-superseded')
    }
    this.update({ ...this.snapshot, phase: this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting' })
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${scheme}//${location.host}${VOICE_ROUTE}`)
    socket.binaryType = 'arraybuffer'
    this.socket = socket
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const readyTimeout = setTimeout(() => {
        if (this.socket !== socket || epoch !== this.connectionEpoch) return
        this.lastReconnectError = '等待实时语音服务就绪超时。'
        this.scheduleReconnect(sessionId)
        if (socket.readyState < WebSocket.CLOSING) socket.close(4000, 'voice-ready-timeout')
        if (!settled) {
          settled = true
          reject(new Error(this.lastReconnectError))
        }
      }, 25_000)
      const rejectOnce = (error: Error): void => {
        if (settled) return
        settled = true
        clearTimeout(readyTimeout)
        reject(error)
      }
      socket.onopen = () => {
        if (this.socket !== socket || epoch !== this.connectionEpoch) return
        socket.send(JSON.stringify({
          type: 'voice.hello',
          protocol: this.supervisorMode ? 'dsh.voice.supervisor.v1' : VOICE_PROTOCOL,
          requestId: crypto.randomUUID(),
          client: {
            platform: 'web',
            version: VOICE_WEB_CLIENT_VERSION,
            binaryWebSocket: true,
            playbackClear: true,
            pcmS16leVerified: true,
            foregroundOnly: false,
            duplex: 'full',
            playbackDrainAck: true,
          },
          ...(this.supervisorMode ? {} : { target: { sessionId } }),
          ...(this.supervisorMode && this.butlerId === undefined ? {} : { butlerId: this.butlerId }),
          audio: {
            input: { encoding: 'pcm_s16le', sampleRate: INPUT_SAMPLE_RATE, channels: AUDIO_CHANNELS, frameDurationMs: 40 },
            output: { encoding: 'pcm_s16le', sampleRate: OUTPUT_SAMPLE_RATE, channels: AUDIO_CHANNELS, frameDurationMs: 40 },
          },
          ...(this.snapshot.voiceSessionId === undefined
            ? {}
            : { resume: { voiceSessionId: this.snapshot.voiceSessionId, lastServerSeq: this.lastServerSeq } }),
        }))
      }
      socket.onmessage = (event) => {
        if (this.socket === socket && epoch === this.connectionEpoch) this.receive(event)
      }
      socket.onerror = () => {
        if (this.socket !== socket || epoch !== this.connectionEpoch) return
        this.lastReconnectError = '无法连接 DSH 实时语音插件。'
        this.scheduleReconnect(sessionId)
        rejectOnce(new Error(this.lastReconnectError))
      }
      const ready = (event: MessageEvent): void => {
        if (this.socket !== socket || epoch !== this.connectionEpoch) return
        if (typeof event.data !== 'string') return
        const message = JSON.parse(event.data) as VoiceServerControl
        if (message.type === 'voice.ready') {
          socket.removeEventListener('message', ready)
          clearTimeout(readyTimeout)
          this.providerReady = true
          this.startHeartbeat()
          this.reconnectAttempt = 0
          this.lastReconnectError = undefined
          if (!settled) {
            settled = true
            resolve()
          }
        }
        if (message.type === 'voice.error' && !message.recoverable) {
          socket.removeEventListener('message', ready)
          this.lastReconnectError = message.message
          this.scheduleReconnect(sessionId)
          rejectOnce(new Error(message.message))
        }
        if (message.type === 'voice.busy') {
          socket.removeEventListener('message', ready)
          const reason = busyMessage(message.occupancy)
          this.lastReconnectError = reason
          rejectOnce(new Error(reason))
        }
      }
      socket.addEventListener('message', ready)
      socket.onclose = (event) => {
        clearTimeout(readyTimeout)
        socket.removeEventListener('message', ready)
        if (this.socket !== socket || epoch !== this.connectionEpoch) return
        this.socket = undefined
        this.providerReady = false
        // Drop queued audio from the dead transport without moving the stream
        // epoch ahead of the Host's continuity cursor.
        this.audio?.clear(this.lastOutputStreamId)
        const reason = event.reason.trim()
        if (this.lastReconnectError === undefined || reason !== 'provider-disconnected') {
          this.lastReconnectError = reason === ''
            ? `实时语音连接关闭（代码 ${event.code}）。`
            : `实时语音连接关闭（代码 ${event.code}：${reason}）。`
        }
        if (!this.ending) this.scheduleReconnect(sessionId)
        rejectOnce(new Error(this.lastReconnectError))
      }
    })
  }

  private receive(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      const frame = decodeAudioFrame(event.data)
      if (frame.kind === AudioFrameKind.ServerOutput) {
        this.lastOutputStreamId = Math.max(this.lastOutputStreamId, frame.streamId)
        this.audio?.play(frame.payload, frame.streamId)
      }
      return
    }
    if (typeof event.data !== 'string') return
    const message = JSON.parse(event.data) as VoiceServerControl
    // A rejected provisional resume has its own short sequence space. Its
    // busy/fatal decision must not be discarded against the old call cursor.
    const handshakeDecision = !this.providerReady
      && (message.type === 'voice.busy' || (message.type === 'voice.error' && !message.recoverable))
    if (!handshakeDecision && message.serverSeq <= this.lastServerSeq) return
    if (message.serverSeq > this.lastServerSeq) this.lastServerSeq = message.serverSeq
    switch (message.type) {
      case 'voice.ready':
        this.update({
          ...this.snapshot,
          phase: 'listening',
          supervisor: message.protocol === 'dsh.voice.supervisor.v1',
          sessionId: message.target.sessionId,
          voiceSessionId: message.voiceSessionId,
          providerModel: message.provider.model,
          turnDetection: message.provider.turnDetection,
          agentRunning: message.target.running,
          error: undefined,
        })
        return
      case 'voice.busy':
        void this.fail(busyMessage(message.occupancy), false, message.occupancy)
        return
      case 'voice.state':
        this.update({
          ...this.snapshot,
          phase: message.phase,
          ...(message.phase === 'thinking' && this.snapshot.phase !== 'thinking'
            ? { assistantTranscript: '' }
            : {}),
        })
        return
      case 'voice.transcript':
        if (message.role === 'user') {
          this.update({ ...this.snapshot, userTranscript: message.text + (message.stash ?? '') })
        } else {
          this.update({
            ...this.snapshot,
            assistantTranscript: message.final
              ? message.text
              : this.snapshot.assistantTranscript + message.text,
          })
        }
        return
      case 'voice.playback-clear':
        this.playbackFinalSequences.clear()
        this.lastOutputStreamId = Math.max(this.lastOutputStreamId, message.streamId)
        this.audio?.clear(message.streamId)
        return
      case 'voice.playback-finalize':
        this.playbackFinalSequences.set(message.streamId, message.lastSequence)
        this.audio?.finalize(message.streamId)
        return
      case 'voice.agent-status':
        this.update({
          ...this.snapshot,
          agentRunning: message.running,
          ...(this.supervisorMode ? { sessionId: message.sessionId } : {}),
          ...(message.summary === undefined ? {} : { agentSummary: message.summary }),
        })
        return
      case 'voice.task-selected': {
        this.settleTaskAction()
        const { pendingApproval: _approval, pendingQuestion: _question, ...snapshot } = this.snapshot
        this.update({ ...snapshot, sessionId: message.sessionId, agentRunning: message.running, error: undefined })
        return
      }
      case 'voice.approval':
        if (message.status === 'pending') {
          this.update({ ...this.snapshot, pendingApproval: message.approval })
        } else if (this.snapshot.pendingApproval?.approvalId === message.approval.approvalId) {
          const { pendingApproval: _pendingApproval, ...withoutApproval } = this.snapshot
          this.update(withoutApproval)
        }
        return
      case 'voice.question':
        if (message.status === 'pending') {
          this.update({ ...this.snapshot, pendingQuestion: message.question })
        } else if (this.snapshot.pendingQuestion?.requestId === message.question.requestId) {
          const { pendingQuestion: _pendingQuestion, ...withoutQuestion } = this.snapshot
          this.update(withoutQuestion)
        }
        return
      case 'voice.error':
        this.settleTaskAction(message.message)
        if (message.recoverable) {
          this.lastReconnectError = message.message
          this.update({ ...this.snapshot, error: message.message })
        } else {
          void this.fail(message.message)
        }
        return
      case 'voice.ended':
        void this.end()
        return
      case 'voice.tool':
      case 'voice.pong':
        return
    }
  }

  private sendAudio(pcm: ArrayBuffer): void {
    const socket = this.socket
    if (!this.providerReady || socket?.readyState !== WebSocket.OPEN) return
    if (socket.bufferedAmount > 4 * 1024 * 1024) {
      this.lastReconnectError = '浏览器上行语音缓冲超过 4 MiB，正在重连。'
      socket.close(4001, 'client-audio-backpressure')
      return
    }
    const sequence = this.inputSequence++
    try {
      socket.send(encodeAudioFrame(
        AudioFrameKind.ClientInput,
        this.inputStreamId,
        sequence,
        pcm,
        { ptsMs: sequence * 40 },
      ))
    } catch (error) {
      this.lastReconnectError = error instanceof Error ? error.message : String(error)
      socket.close(4001, 'client-audio-send-failed')
    }
  }

  private sendControl(message: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message))
  }

  private scheduleReconnect(sessionId: string): void {
    if (this.reconnectTimer !== undefined || this.ending) return
    if (this.reconnectAttempt >= 8) {
      const detail = this.lastReconnectError === undefined ? '' : ` 最后原因：${this.lastReconnectError}`
      void this.fail(`实时语音连接多次重试失败，DSH 中已经开始的任务不会被取消。${detail}`, true)
      return
    }
    const rateLimited = /rate.?limit|限流|代码\s*1007/i.test(this.lastReconnectError ?? '')
    const delay = rateLimited
      ? Math.min(60_000, 15_000 * (2 ** this.reconnectAttempt))
      : Math.min(30_000, 1000 * (2 ** this.reconnectAttempt))
    this.reconnectAttempt += 1
    this.update({ ...this.snapshot, phase: 'reconnecting' })
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      void this.connect(sessionId).catch((error: unknown) => {
        if (!this.ending) this.scheduleReconnect(sessionId)
        if (error instanceof Error) this.update({ ...this.snapshot, error: error.message })
      })
    }, delay)
  }

  private tick(): void {
    if (this.startedAt === 0) return
    this.update({ ...this.snapshot, elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1000) })
  }

  /** Stop audible output before the server-side VAD event completes its round trip. */
  private handleLocalSpeechStart(): void {
    if (this.snapshot.phase !== 'speaking'
      || this.snapshot.muted
      || this.snapshot.turnDetection !== 'server_vad') return
    this.audio?.interruptPlayback()
    this.sendControl({ type: 'voice.cancel-response', source: 'local-vad' })
    this.update({ ...this.snapshot, phase: 'listening' })
  }

  private async fail(
    message: string,
    preserveResume = false,
    occupancy?: VoiceOccupancyStatus,
  ): Promise<void> {
    const resumeContext = preserveResume ? localResumeContext(this.snapshot) : undefined
    this.ending = true
    await this.cleanup()
    if (resumeContext === undefined) this.resetCallCursors()
    this.update({
      ...INITIAL_SNAPSHOT,
      ...resumeContext,
      phase: 'error',
      error: message,
      ...(occupancy === undefined ? {} : { occupancy }),
    })
  }

  private async cleanup(): Promise<void> {
    this.startEpoch += 1
    this.connectionEpoch += 1
    if (this.timer !== undefined) clearInterval(this.timer)
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer)
    if (this.heartbeatTimer !== undefined) clearInterval(this.heartbeatTimer)
    this.timer = undefined
    this.reconnectTimer = undefined
    this.heartbeatTimer = undefined
    const socket = this.socket
    this.socket = undefined
    if (socket !== undefined && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'voice client closed')
    await this.audio?.close()
    this.audio = undefined
    this.startedAt = 0
    this.providerReady = false
    this.inputSequence = 0
    this.inputStreamId += 1
  }

  private async refreshPresence(): Promise<VoiceOccupancyStatus | undefined> {
    const requestSeq = ++this.presenceRequestSeq
    try {
      const response = await fetch(VOICE_STATUS_ROUTE, { cache: 'no-store' })
      if (!response.ok) return undefined
      const occupancy = await response.json() as VoiceOccupancyStatus
      if (occupancy.protocol !== VOICE_PROTOCOL || typeof occupancy.active !== 'boolean') return undefined
      if (requestSeq !== this.presenceRequestSeq) return undefined
      this.update({ ...this.snapshot, occupancy })
      void this.refreshInbox()
      return occupancy
    } catch {
      return undefined
    }
  }

  /**
   * Presence polling already runs every two seconds, so the call-back list
   * rides that cadence instead of opening a second timer.
   */
  private async refreshInbox(): Promise<void> {
    const revision = this.inboxRevision
    try {
      const response = await fetch(VOICE_INBOX_ROUTE, { cache: 'no-store' })
      if (!response.ok) return
      const snapshot = await response.json() as VoiceInboxSnapshot
      if (revision !== this.inboxRevision) return
      if (snapshot.protocol !== VOICE_PROTOCOL || !Array.isArray(snapshot.entries)) return
      const live = new Set(snapshot.entries.map(entry => entry.id))
      this.update({
        ...this.snapshot,
        inbox: snapshot.entries,
        inboxSelection: this.snapshot.inboxSelection.filter(id => live.has(id)),
        snoozedInbox: [...new Set([
          ...this.snapshot.snoozedInbox.filter(id => live.has(id)),
          ...snapshot.entries.filter(entry => entry.snoozed).map(entry => entry.id),
        ])],
        ...(snapshot.error === undefined ? {} : { error: snapshot.error }),
      })
    } catch {
      return
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) return
    this.heartbeatTimer = setInterval(() => {
      this.sendControl({ type: 'voice.ping', sentAt: Date.now() })
    }, 15_000)
  }

  private resetCallCursors(): void {
    this.lastServerSeq = 0
    this.lastOutputStreamId = 0
  }

  private update(next: VoiceSnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}

function busyMessage(occupancy: VoiceOccupancyStatus): string {
  void occupancy
  return '实时语音正由另一个客户端占用，请先在该端结束通话。'
}

function localResumeContext(
  snapshot: VoiceSnapshot,
): { sessionId: string; voiceSessionId: string } | undefined {
  return snapshot.sessionId === undefined || snapshot.voiceSessionId === undefined
    ? undefined
    : { sessionId: snapshot.sessionId, voiceSessionId: snapshot.voiceSessionId }
}

/** Presence is authoritative only before this WebUI owns or can resume a call. */
export function isVoiceDialUnavailable(snapshot: VoiceSnapshot): boolean {
  const activeTransport = snapshot.phase !== 'idle' && snapshot.phase !== 'error'
  return snapshot.occupancy?.active === true
    && !activeTransport
    && localResumeContext(snapshot) === undefined
}
