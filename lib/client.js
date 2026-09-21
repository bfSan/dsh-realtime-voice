window.__ModuleLoader__.load({
	id: "@harness-remote/dsh-realtime-voice",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region src/models.ts
		/** Realtime voice models supported by the built-in DashScope provider. */
		const REALTIME_VOICE_MODELS = {
			flash: "qwen-audio-3.0-realtime-flash",
			plus: "qwen-audio-3.0-realtime-plus"
		};
		const REALTIME_VOICE_TURN_DETECTION = {
			fast: "server_vad",
			semantic: "smart_turn",
			semanticV2: "smart_turn_v2"
		};
		/** Ordered for the settings card; the service rejects anything outside this set. */
		const REALTIME_VOICE_TURN_DETECTION_MODES = [
			REALTIME_VOICE_TURN_DETECTION.fast,
			REALTIME_VOICE_TURN_DETECTION.semantic,
			REALTIME_VOICE_TURN_DETECTION.semanticV2
		];
		/**
		* The exact voice list returned by the service when an unsupported id is sent.
		* Ordering is preserved so the first entry stays the documented default.
		*/
		const REALTIME_VOICE_VOICES = [
			"longanqian",
			"longanlingxin",
			"longanlufeng",
			"longanlingxi",
			"longanxiaoxin",
			"longanfengyue",
			"longanyuanfei",
			"longanhuan_v3.6",
			"longjielidou_v3.6",
			"longpaopao_v3.6",
			"longhuohuo_v3.6",
			"longchuanshu_v3.6",
			"loongmary",
			"loongeva_v3.6",
			"loongjohn",
			"daniel",
			"echo",
			"hannah",
			"sherry"
		];
		/** How much of the DSH Agent's stage-by-stage progress may reach the live call. */
		const REALTIME_VOICE_PROGRESS_REPORTING = {
			keyOnly: "key-only",
			silent: "silent",
			all: "all"
		};
		/** Default ring length for an incoming report, in milliseconds. */
		const DEFAULT_RING_DURATION_MS = 5e3;
		const DEFAULT_REALTIME_VOICE_MODEL = REALTIME_VOICE_MODELS.plus;
		const DEFAULT_REALTIME_VOICE_TURN_DETECTION = REALTIME_VOICE_TURN_DETECTION.fast;
		const DEFAULT_REALTIME_VOICE_VOICE = "longanqian";
		const DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING = REALTIME_VOICE_PROGRESS_REPORTING.keyOnly;
		const REALTIME_VOICE_SETTINGS_NAMESPACE = "realtime-voice";
		function isRealtimeVoiceModel(value) {
			return value === REALTIME_VOICE_MODELS.flash || value === REALTIME_VOICE_MODELS.plus;
		}
		function isRealtimeVoiceTurnDetection(value) {
			return REALTIME_VOICE_TURN_DETECTION_MODES.includes(value);
		}
		function isRealtimeVoiceVoice(value) {
			return REALTIME_VOICE_VOICES.includes(value);
		}
		/** Friendly names for the built-in voices; unknown ids stay verbatim. */
		const REALTIME_VOICE_VOICE_LABELS = {
			longanqian: "龙安·芊（默认）",
			longanlingxin: "龙安·灵心",
			longanlufeng: "龙安·陆风",
			longanlingxi: "龙安·灵犀",
			longanxiaoxin: "龙安·小欣",
			longanfengyue: "龙安·风月",
			longanyuanfei: "龙安·远飞",
			"longanhuan_v3.6": "龙安·欢 v3.6",
			"longjielidou_v3.6": "龙杰·栗豆 v3.6",
			"longpaopao_v3.6": "龙·泡泡 v3.6",
			"longhuohuo_v3.6": "龙·火火 v3.6",
			"longchuanshu_v3.6": "龙·川蜀 v3.6",
			loongmary: "Loong Mary",
			"loongeva_v3.6": "Loong Eva v3.6",
			loongjohn: "Loong John",
			daniel: "Daniel",
			echo: "Echo",
			hannah: "Hannah",
			sherry: "Sherry"
		};
		function realtimeVoiceVoiceLabel(voice) {
			if (voice === void 0) return "未知音色";
			return isRealtimeVoiceVoice(voice) ? REALTIME_VOICE_VOICE_LABELS[voice] : voice;
		}
		function isRealtimeVoiceProgressReporting(value) {
			return value === REALTIME_VOICE_PROGRESS_REPORTING.keyOnly || value === REALTIME_VOICE_PROGRESS_REPORTING.silent || value === REALTIME_VOICE_PROGRESS_REPORTING.all;
		}
		function realtimeVoiceModelLabel(model) {
			if (model === REALTIME_VOICE_MODELS.flash) return "Flash · 经济低延迟";
			if (model === REALTIME_VOICE_MODELS.plus) return "Plus · 高质量";
			return model ?? "未知模型";
		}
		function realtimeVoiceTurnDetectionLabel(mode) {
			if (mode === REALTIME_VOICE_TURN_DETECTION.fast) return "快速声学打断";
			if (mode === REALTIME_VOICE_TURN_DETECTION.semanticV2) return "智能语义轮次 v2";
			if (mode === REALTIME_VOICE_TURN_DETECTION.semantic) return "智能语义轮次";
			return mode ?? "未知打断模式";
		}
		//#endregion
		//#region src/protocol.ts
		/** Versioned client-neutral wire contract shared by WebUI and WeChat Mini Program clients. */
		const VOICE_PROTOCOL = "dsh.voice.v1";
		const VOICE_ROUTE = "/plugins/realtime-voice/v1";
		const VOICE_STATUS_ROUTE = "/plugins/realtime-voice/v1/status";
		const VOICE_INBOX_ROUTE = "/plugins/realtime-voice/v1/inbox";
		const VOICE_PREVIEW_ROUTE = "/plugins/realtime-voice/v1/preview";
		const VOICE_WEB_CLIENT_VERSION = "0.1.0-alpha.22";
		const INPUT_SAMPLE_RATE = 16e3;
		const OUTPUT_SAMPLE_RATE = 24e3;
		const AUDIO_MAGIC = [
			68,
			83,
			86,
			49
		];
		/** Encode one ordered frame in network byte order for browsers and Mini Program ArrayBuffers. */
		function encodeAudioFrame(kind, streamId, sequence, payload, metadata = {}) {
			const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
			const result = new ArrayBuffer(24 + bytes.byteLength);
			const view = new DataView(result);
			AUDIO_MAGIC.forEach((byte, index) => view.setUint8(index, byte));
			view.setUint8(4, 1);
			view.setUint8(5, kind);
			view.setUint8(6, 1);
			view.setUint8(7, metadata.flags ?? 0);
			view.setUint32(8, streamId);
			view.setUint32(12, sequence);
			view.setUint32(16, metadata.ptsMs ?? 0);
			view.setUint32(20, bytes.byteLength);
			new Uint8Array(result, 24).set(bytes);
			return result;
		}
		/** Decode and validate a binary voice frame without retaining the caller's mutable view. */
		function decodeAudioFrame(data) {
			const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
			if (bytes.byteLength < 24) throw new Error("voice audio frame is shorter than its header");
			const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			if (AUDIO_MAGIC.some((byte, index) => view.getUint8(index) !== byte)) throw new Error("voice audio frame has an invalid magic");
			if (view.getUint8(4) !== 1) throw new Error("voice audio frame uses an unsupported version");
			const kind = view.getUint8(5);
			if (kind !== 1 && kind !== 2) throw new Error("voice audio frame has an unknown kind");
			const codec = view.getUint8(6);
			if (codec !== 1) throw new Error("voice audio frame uses an unsupported codec");
			const flags = view.getUint8(7);
			if ((flags & -4) !== 0) throw new Error("voice audio frame uses unsupported flags");
			if (view.getUint32(20) !== bytes.byteLength - 24) throw new Error("voice audio frame payload length does not match its header");
			return {
				kind,
				codec,
				flags,
				streamId: view.getUint32(8),
				sequence: view.getUint32(12),
				ptsMs: view.getUint32(16),
				payload: bytes.slice(24)
			};
		}
		//#endregion
		//#region src/supervisor-protocol.ts
		const VOICE_DIRECTORY_ROUTE = "/api/realtime-voice/directory";
		const VOICE_BUTLER_ROUTE = "/api/realtime-voice/butlers";
		const SUPERVISOR_TOOL_NAMES = [
			"list_voice_projects",
			"list_voice_agents",
			"list_voice_tasks",
			"read_voice_task_result",
			"select_voice_task",
			"create_voice_task",
			"submit_voice_task",
			"cancel_voice_task",
			"list_voice_butlers",
			"switch_voice_butler",
			"remember_voice_scope",
			"note_voice_todo"
		];
		const descriptions = {
			list_voice_projects: "列出 DSH 已登记项目。",
			list_voice_agents: "列出 DSH 可用执行 Agent preset。",
			list_voice_tasks: "列出已有任务；不创建任务，不执行工作。",
			read_voice_task_result: "读取指定任务的权威终态和结果，用于口头汇报。空闲不代表没有结果。",
			select_voice_task: "明确选择用户指定的已有执行任务，不能擅自推断目标。",
			create_voice_task: "用户明确要求新任务并确认项目及 Agent 后创建空白执行任务，不自动执行。",
			submit_voice_task: "用户新一轮明确下达工作后提交到已选任务；正在执行时补充会 steer。听汇报不得调用。",
			cancel_voice_task: "用户明确要求停止时取消已选择的任务。",
			list_voice_butlers: "列出已有语音总管及其负责范围，用于点名或确认由谁接手。",
			switch_voice_butler: "用户明确点名或要求换人时切换到另一位总管；切换后必须重新自报身份。",
			remember_voice_scope: "记下这位总管负责的范围或偏好，只影响记忆，不执行任何工作。",
			note_voice_todo: "记下这位总管要跟进的事项，只影响记忆，不执行任何工作。"
		};
		SUPERVISOR_TOOL_NAMES.map((name) => {
			const properties = name === "create_voice_task" ? {
				workspace: { type: "string" },
				presetId: { type: "string" }
			} : name === "submit_voice_task" ? { instruction: {
				type: "string",
				maxLength: 12e3
			} } : name === "select_voice_task" || name === "read_voice_task_result" ? { taskId: { type: "string" } } : name === "switch_voice_butler" ? { butlerId: { type: "string" } } : name === "remember_voice_scope" || name === "note_voice_todo" ? { note: {
				type: "string",
				maxLength: 2e3
			} } : {};
			return {
				type: "function",
				function: {
					name,
					description: descriptions[name],
					parameters: {
						type: "object",
						additionalProperties: false,
						properties,
						required: Object.keys(properties)
					}
				}
			};
		});
		//#endregion
		//#region src/client/audio-worklet-source.ts
		/** Self-contained AudioWorklet module: 16 kHz capture resampler plus 24 kHz streaming player. */
		const AUDIO_WORKLET_SOURCE = String.raw`
class DshVoiceCapture extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.targetRate = options.processorOptions.targetSampleRate
    this.frameSamples = options.processorOptions.frameSamples
    this.pending = []
    this.position = 0
    this.output = []
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (!input || input.length === 0) return true
    for (let i = 0; i < input.length; i++) this.pending.push(input[i])
    const ratio = sampleRate / this.targetRate
    while (this.position + 1 < this.pending.length) {
      const left = Math.floor(this.position)
      const frac = this.position - left
      const sample = this.pending[left] * (1 - frac) + this.pending[left + 1] * frac
      this.output.push(Math.max(-1, Math.min(1, sample)))
      this.position += ratio
    }
    const consumed = Math.floor(this.position)
    if (consumed > 0) {
      this.pending.splice(0, consumed)
      this.position -= consumed
    }
    while (this.output.length >= this.frameSamples) {
      const frame = this.output.splice(0, this.frameSamples)
      const pcm = new Int16Array(frame.length)
      for (let i = 0; i < frame.length; i++) pcm[i] = frame[i] < 0 ? frame[i] * 32768 : frame[i] * 32767
      this.port.postMessage(pcm.buffer, [pcm.buffer])
    }
    return true
  }
}

class DshVoicePlayback extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.sourceRate = options.processorOptions.sourceSampleRate
    this.queue = []
    this.offset = 0
    this.epoch = 0
    this.drainEpoch = undefined
    this.port.onmessage = (event) => {
      const message = event.data
      if (message.type === 'clear') {
        this.queue = []
        this.offset = 0
        this.epoch = message.epoch
        this.drainEpoch = undefined
        return
      }
      if (message.type === 'finalize') {
        if (message.epoch >= this.epoch) this.drainEpoch = message.epoch
        return
      }
      if (message.type !== 'audio' || message.epoch < this.epoch) return
      if (message.epoch > this.epoch) {
        this.queue = []
        this.offset = 0
        this.epoch = message.epoch
        this.drainEpoch = undefined
      }
      const source = new Int16Array(message.pcm)
      const ratio = this.sourceRate / sampleRate
      const outputLength = Math.max(1, Math.floor(source.length / ratio))
      const decoded = new Float32Array(outputLength)
      for (let i = 0; i < outputLength; i++) {
        const position = i * ratio
        const left = Math.floor(position)
        const right = Math.min(source.length - 1, left + 1)
        const frac = position - left
        decoded[i] = ((source[left] * (1 - frac)) + (source[right] * frac)) / 32768
      }
      this.queue.push(decoded)
    }
  }
  process(_inputs, outputs) {
    const output = outputs[0] && outputs[0][0]
    if (!output) return true
    output.fill(0)
    let written = 0
    while (written < output.length && this.queue.length > 0) {
      const chunk = this.queue[0]
      const count = Math.min(output.length - written, chunk.length - this.offset)
      output.set(chunk.subarray(this.offset, this.offset + count), written)
      written += count
      this.offset += count
      if (this.offset >= chunk.length) {
        this.queue.shift()
        this.offset = 0
      }
    }
    if (this.queue.length === 0 && this.drainEpoch === this.epoch) {
      this.port.postMessage({ type: 'drained', epoch: this.epoch })
      this.drainEpoch = undefined
    }
    return true
  }
}

registerProcessor('dsh-voice-capture', DshVoiceCapture)
registerProcessor('dsh-voice-playback', DshVoicePlayback)
`;
		//#endregion
		//#region src/client/local-vad.ts
		const DEFAULT_OPTIONS = {
			rmsThreshold: .025,
			peakThreshold: .1,
			attackFrames: 2,
			releaseFrames: 5
		};
		/** Small browser-side onset detector used only to stop playback before the cloud VAD round trip. */
		var LocalVoiceActivityDetector = class {
			options;
			hotFrames = 0;
			quietFrames = 0;
			active = false;
			constructor(options = DEFAULT_OPTIONS) {
				this.options = options;
			}
			push(pcm) {
				const samples = new Int16Array(pcm);
				if (samples.length === 0) return false;
				let energy = 0;
				let peak = 0;
				for (const value of samples) {
					const normalized = Math.abs(value) / 32768;
					energy += normalized * normalized;
					peak = Math.max(peak, normalized);
				}
				if (Math.sqrt(energy / samples.length) >= this.options.rmsThreshold && peak >= this.options.peakThreshold) {
					this.quietFrames = 0;
					this.hotFrames += 1;
					if (!this.active && this.hotFrames >= this.options.attackFrames) {
						this.active = true;
						return true;
					}
					return false;
				}
				this.hotFrames = 0;
				if (!this.active) return false;
				this.quietFrames += 1;
				if (this.quietFrames >= this.options.releaseFrames) {
					this.active = false;
					this.quietFrames = 0;
				}
				return false;
			}
			reset() {
				this.hotFrames = 0;
				this.quietFrames = 0;
				this.active = false;
			}
		};
		//#endregion
		//#region src/client/audio-engine.ts
		/** Browser microphone capture and streaming PCM playback; owns every browser media resource it creates. */
		var BrowserAudioEngine = class {
			onInput;
			onSpeechStart;
			onPlaybackDrained;
			context;
			stream;
			capture;
			playback;
			moduleUrl;
			playbackEpoch = 0;
			localVad = new LocalVoiceActivityDetector();
			constructor(onInput, onSpeechStart = () => {}, onPlaybackDrained = () => {}) {
				this.onInput = onInput;
				this.onSpeechStart = onSpeechStart;
				this.onPlaybackDrained = onPlaybackDrained;
			}
			async start() {
				this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				} });
				const context = new AudioContext({ latencyHint: "interactive" });
				this.context = context;
				this.moduleUrl = URL.createObjectURL(new Blob([AUDIO_WORKLET_SOURCE], { type: "text/javascript" }));
				await context.audioWorklet.addModule(this.moduleUrl);
				const source = context.createMediaStreamSource(this.stream);
				const capture = new AudioWorkletNode(context, "dsh-voice-capture", {
					numberOfInputs: 1,
					numberOfOutputs: 1,
					outputChannelCount: [1],
					processorOptions: {
						targetSampleRate: INPUT_SAMPLE_RATE,
						frameSamples: 640
					}
				});
				const silent = context.createGain();
				silent.gain.value = 0;
				source.connect(capture);
				capture.connect(silent).connect(context.destination);
				capture.port.onmessage = (event) => {
					if (this.localVad.push(event.data)) this.onSpeechStart();
					this.onInput(event.data);
				};
				this.capture = capture;
				const playback = new AudioWorkletNode(context, "dsh-voice-playback", {
					numberOfInputs: 0,
					numberOfOutputs: 1,
					outputChannelCount: [1],
					processorOptions: { sourceSampleRate: OUTPUT_SAMPLE_RATE }
				});
				playback.connect(context.destination);
				playback.port.onmessage = (event) => {
					if (event.data.type === "drained" && typeof event.data.epoch === "number") this.onPlaybackDrained(event.data.epoch);
				};
				this.playback = playback;
				await context.resume();
			}
			play(pcm, epoch) {
				this.playbackEpoch = Math.max(this.playbackEpoch, epoch);
				const transferable = pcm.slice().buffer;
				this.playback?.port.postMessage({
					type: "audio",
					epoch,
					pcm: transferable
				}, [transferable]);
			}
			clear(epoch) {
				this.playbackEpoch = epoch;
				this.playback?.port.postMessage({
					type: "clear",
					epoch
				});
			}
			finalize(epoch) {
				this.playback?.port.postMessage({
					type: "finalize",
					epoch
				});
			}
			/** Synchronous local barge-in; Host will confirm the same next stream epoch. */
			interruptPlayback() {
				this.clear(this.playbackEpoch + 1);
			}
			setMuted(muted) {
				for (const track of this.stream?.getAudioTracks() ?? []) track.enabled = !muted;
			}
			async close() {
				for (const track of this.stream?.getTracks() ?? []) track.stop();
				this.stream = void 0;
				this.capture?.disconnect();
				this.playback?.disconnect();
				this.capture = void 0;
				this.playback = void 0;
				this.playbackEpoch = 0;
				this.localVad.reset();
				if (this.context !== void 0 && this.context.state !== "closed") await this.context.close();
				this.context = void 0;
				if (this.moduleUrl !== void 0) URL.revokeObjectURL(this.moduleUrl);
				this.moduleUrl = void 0;
			}
		};
		//#endregion
		//#region src/client/controller.ts
		const INITIAL_SNAPSHOT = {
			phase: "idle",
			muted: false,
			userTranscript: "",
			assistantTranscript: "",
			agentRunning: false,
			elapsedSeconds: 0,
			inbox: [],
			inboxSelection: [],
			snoozedInbox: []
		};
		/** Root-lifetime call controller shared by the session button and frame overlay through inject hooks. */
		var VoiceCallController = class {
			supervisorMode = false;
			butlerId;
			playbackFinalSequences = /* @__PURE__ */ new Map();
			taskAction;
			refreshButlers() {
				return fetch(VOICE_BUTLER_ROUTE, { cache: "no-store" }).then(async (response) => {
					if (!response.ok) return [];
					const payload = await response.json();
					return Array.isArray(payload.butlers) ? payload.butlers : [];
				}).catch(() => []);
			}
			/** Roster snapshot for the launcher; refreshed whenever the panel needs it. */
			roster = [];
			butlerRoster() {
				if (this.roster.length === 0) this.refreshButlers().then((rows) => {
					this.roster = rows;
				});
				return this.roster;
			}
			sendTaskAction(message) {
				if (this.taskAction) return Promise.reject(/* @__PURE__ */ new Error("正在选择任务，请稍候"));
				return new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						this.taskAction = void 0;
						reject(/* @__PURE__ */ new Error("选择任务超时，请检查连接后重试"));
					}, 15e3);
					this.taskAction = {
						resolve,
						reject,
						timer
					};
					this.socket?.send(JSON.stringify(message));
				});
			}
			settleTaskAction(error) {
				const action = this.taskAction;
				if (!action) return;
				this.taskAction = void 0;
				clearTimeout(action.timer);
				if (error) action.reject(new Error(error));
				else action.resolve();
			}
			async startSupervisor() {
				if (this.snapshot.phase !== "idle" && this.snapshot.phase !== "error") return;
				await this.start("voice-supervisor", true);
			}
			/** Call a named butler instead of the roster default. */
			async startButler(butlerId) {
				if (this.snapshot.phase !== "idle" && this.snapshot.phase !== "error") return;
				this.butlerId = butlerId;
				try {
					await this.start("voice-supervisor", true);
				} finally {
					this.butlerId = void 0;
				}
			}
			async createButler(name) {
				const response = await fetch(VOICE_BUTLER_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name })
				});
				if (!response.ok) throw new Error("新建语音总管失败，请稍后重试。");
				const created = await response.json();
				this.roster = await this.refreshButlers();
				return created.id;
			}
			async selectTask(taskId) {
				if (!this.supervisorMode || !this.providerReady) throw new Error("请先接通总管电话");
				await this.sendTaskAction({
					type: "voice.select-task",
					taskId
				});
			}
			async createTask(workspace, presetId) {
				if (!this.supervisorMode || !this.providerReady) throw new Error("请先接通总管电话");
				await this.sendTaskAction({
					type: "voice.create-task",
					workspace,
					presetId,
					requestId: crypto.randomUUID()
				});
			}
			snapshot = INITIAL_SNAPSHOT;
			listeners = /* @__PURE__ */ new Set();
			socket;
			audio;
			inputSequence = 0;
			inputStreamId = 1;
			providerReady = false;
			startedAt = 0;
			timer;
			reconnectTimer;
			reconnectAttempt = 0;
			connectionEpoch = 0;
			lastReconnectError;
			ending = false;
			presenceTimer;
			heartbeatTimer;
			startEpoch = 0;
			presenceRequestSeq = 0;
			lastServerSeq = 0;
			lastOutputStreamId = 0;
			inboxRevision = 0;
			answeringInbox = false;
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			startPresence() {
				if (this.presenceTimer !== void 0) return;
				this.refreshPresence();
				this.presenceTimer = setInterval(() => {
					if (document.visibilityState !== "hidden") this.refreshPresence();
				}, 2e3);
			}
			toggleInboxSelection(entryId) {
				const selected = this.snapshot.inboxSelection;
				const next = selected.includes(entryId) ? selected.filter((id) => id !== entryId) : [...selected, entryId];
				this.update({
					...this.snapshot,
					inboxSelection: next
				});
			}
			selectAllInbox() {
				this.update({
					...this.snapshot,
					inboxSelection: this.snapshot.inbox.filter((entry) => !entry.delivered).map((entry) => entry.id)
				});
			}
			clearInboxSelection() {
				this.update({
					...this.snapshot,
					inboxSelection: []
				});
			}
			/**
			* Stop ringing for one report while leaving it in the list.
			*
			* Snooze stays local on purpose: the Host's `delivered` flag means "already
			* spoken", and a snoozed report has not been spoken, so pushing it to the
			* Host would lose the task rather than defer it.
			*/
			snoozeInbox(entryId) {
				this.update({
					...this.snapshot,
					inboxSelection: this.snapshot.inboxSelection.filter((id) => id !== entryId),
					snoozedInbox: this.snapshot.snoozedInbox.includes(entryId) ? this.snapshot.snoozedInbox : [...this.snapshot.snoozedInbox, entryId]
				});
				fetch(`${VOICE_INBOX_ROUTE}?id=${encodeURIComponent(entryId)}`, { method: "PATCH" }).then((response) => {
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
				}).catch(() => this.update({
					...this.snapshot,
					error: "稍后状态仅在当前窗口生效，保存失败。"
				}));
			}
			/** Take one report immediately, ignoring whatever else is selected. */
			async answerInboxOne(entryId) {
				if (this.answeringInbox) return;
				const entry = this.snapshot.inbox.find((candidate) => candidate.id === entryId);
				if (entry === void 0) return;
				if (entry.requiresOriginalSession === true) {
					this.update({
						...this.snapshot,
						error: "此问题来自上次运行，请在原 DSH 任务中继续回答。"
					});
					return;
				}
				this.answeringInbox = true;
				try {
					await this.start(entry.sessionId);
					if (this.snapshot.phase === "listening" || this.snapshot.phase === "agent-working") {
						this.sendControl({
							type: "voice.inbox-deliver",
							entryIds: [entryId]
						});
						this.update({
							...this.snapshot,
							inboxSelection: this.snapshot.inboxSelection.filter((id) => id !== entryId)
						});
					}
				} finally {
					this.answeringInbox = false;
				}
			}
			/**
			* Ring back: take the call up against the selected task's own session and
			* ask the Host to speak those results in selection order.
			*/
			async answerInbox(sessionId) {
				if (this.answeringInbox) return;
				const selected = this.snapshot.inboxSelection.length > 0 ? this.snapshot.inboxSelection : this.snapshot.inbox.filter((entry) => !entry.delivered).slice(0, 1).map((entry) => entry.id);
				if (selected.length === 0) return;
				if (this.snapshot.inbox.some((entry) => selected.includes(entry.id) && entry.requiresOriginalSession)) {
					this.update({
						...this.snapshot,
						error: "所选问题来自上次运行，请在原 DSH 任务中继续回答。"
					});
					return;
				}
				const target = sessionId ?? this.snapshot.inbox.find((entry) => entry.id === selected[0])?.sessionId;
				if (target === void 0) return;
				this.answeringInbox = true;
				try {
					await this.start(target);
					if (this.snapshot.phase === "listening" || this.snapshot.phase === "agent-working") {
						this.sendControl({
							type: "voice.inbox-deliver",
							entryIds: [...selected]
						});
						this.update({
							...this.snapshot,
							inboxSelection: []
						});
					}
				} finally {
					this.answeringInbox = false;
				}
			}
			/** Keep the task in the list but stop offering it as a call to take. */
			async dismissInbox(entryIds) {
				if (entryIds.length === 0) return;
				this.inboxRevision += 1;
				try {
					const query = entryIds.map((id) => `id=${encodeURIComponent(id)}`).join("&");
					const response = await fetch(`${VOICE_INBOX_ROUTE}?${query}`, { method: "DELETE" });
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					this.inboxRevision += 1;
					this.update({
						...this.snapshot,
						error: void 0,
						inbox: this.snapshot.inbox.filter((entry) => !entryIds.includes(entry.id)),
						inboxSelection: this.snapshot.inboxSelection.filter((id) => !entryIds.includes(id)),
						snoozedInbox: this.snapshot.snoozedInbox.filter((id) => !entryIds.includes(id))
					});
				} catch (error) {
					this.update({
						...this.snapshot,
						error: `标记已读失败，条目已保留：${String(error)}`
					});
				}
			}
			async start(sessionId, supervisor = false) {
				if (this.snapshot.phase !== "idle" && this.snapshot.phase !== "error") return;
				this.supervisorMode = supervisor;
				const resumeContext = localResumeContext(this.snapshot);
				const targetSessionId = resumeContext?.sessionId ?? sessionId;
				if (!window.isSecureContext || navigator.mediaDevices?.getUserMedia === void 0) {
					this.update({
						...INITIAL_SNAPSHOT,
						...resumeContext,
						phase: "error",
						error: "实时语音需要安全上下文：请使用 localhost 或 HTTPS。"
					});
					return;
				}
				const startEpoch = ++this.startEpoch;
				this.ending = false;
				this.update({
					...INITIAL_SNAPSHOT,
					...resumeContext,
					phase: "connecting",
					sessionId: targetSessionId
				});
				const occupancy = await this.refreshPresence();
				if (startEpoch !== this.startEpoch || this.ending) return;
				if (occupancy?.active && resumeContext === void 0) {
					this.update({
						...INITIAL_SNAPSHOT,
						occupancy,
						phase: "error",
						error: busyMessage(occupancy)
					});
					return;
				}
				this.reconnectAttempt = 0;
				this.lastReconnectError = void 0;
				this.update({
					...INITIAL_SNAPSHOT,
					...resumeContext,
					phase: "requesting-permission",
					sessionId: targetSessionId,
					...occupancy === void 0 ? {} : { occupancy }
				});
				try {
					const audio = new BrowserAudioEngine((pcm) => this.sendAudio(pcm), () => this.handleLocalSpeechStart(), (streamId) => {
						const lastSequence = this.playbackFinalSequences.get(streamId);
						this.sendControl({
							type: "voice.playback-drained",
							streamId,
							...lastSequence === void 0 ? {} : { lastSequence }
						});
					});
					this.audio = audio;
					await audio.start();
					this.startedAt = Date.now();
					this.timer = setInterval(() => this.tick(), 1e3);
					await this.connect(targetSessionId);
				} catch (error) {
					if (this.ending) return;
					const message = error instanceof Error ? error.message : String(error);
					if (this.reconnectTimer !== void 0) this.update({
						...this.snapshot,
						error: message
					});
					else await this.fail(message, resumeContext !== void 0);
				}
			}
			async end() {
				if (this.snapshot.phase === "idle") return;
				this.ending = true;
				this.settleTaskAction("通话已结束");
				this.update({
					...this.snapshot,
					phase: "ending"
				});
				this.sendControl({
					type: "voice.end",
					reason: "user-ended"
				});
				await this.cleanup();
				this.resetCallCursors();
				this.update(INITIAL_SNAPSHOT);
			}
			toggleMute() {
				const muted = !this.snapshot.muted;
				this.audio?.setMuted(muted);
				this.update({
					...this.snapshot,
					muted
				});
			}
			cancelResponse() {
				this.audio?.interruptPlayback();
				this.sendControl({
					type: "voice.cancel-response",
					source: "user"
				});
			}
			answerApproval(approvalId, outcome) {
				if (this.snapshot.pendingApproval?.approvalId !== approvalId) return;
				this.sendControl({
					type: "voice.approval-answer",
					approvalId,
					outcome
				});
			}
			answerQuestion(requestId, answers) {
				if (this.snapshot.pendingQuestion?.requestId !== requestId || answers.length === 0) return;
				this.sendControl({
					type: "voice.question-answer",
					requestId,
					answers
				});
			}
			async dispose() {
				this.ending = true;
				this.settleTaskAction("语音组件已关闭");
				if (this.presenceTimer !== void 0) clearInterval(this.presenceTimer);
				this.presenceTimer = void 0;
				await this.cleanup();
				this.listeners.clear();
			}
			async connect(sessionId) {
				const epoch = ++this.connectionEpoch;
				const previous = this.socket;
				this.socket = void 0;
				if (previous !== void 0 && previous.readyState < WebSocket.CLOSING) previous.close(1e3, "voice-connection-superseded");
				this.update({
					...this.snapshot,
					phase: this.reconnectAttempt === 0 ? "connecting" : "reconnecting"
				});
				const scheme = location.protocol === "https:" ? "wss:" : "ws:";
				const socket = new WebSocket(`${scheme}//${location.host}${VOICE_ROUTE}`);
				socket.binaryType = "arraybuffer";
				this.socket = socket;
				await new Promise((resolve, reject) => {
					let settled = false;
					const readyTimeout = setTimeout(() => {
						if (this.socket !== socket || epoch !== this.connectionEpoch) return;
						this.lastReconnectError = "等待实时语音服务就绪超时。";
						this.scheduleReconnect(sessionId);
						if (socket.readyState < WebSocket.CLOSING) socket.close(4e3, "voice-ready-timeout");
						if (!settled) {
							settled = true;
							reject(new Error(this.lastReconnectError));
						}
					}, 25e3);
					const rejectOnce = (error) => {
						if (settled) return;
						settled = true;
						clearTimeout(readyTimeout);
						reject(error);
					};
					socket.onopen = () => {
						if (this.socket !== socket || epoch !== this.connectionEpoch) return;
						socket.send(JSON.stringify({
							type: "voice.hello",
							protocol: this.supervisorMode ? "dsh.voice.supervisor.v1" : VOICE_PROTOCOL,
							requestId: crypto.randomUUID(),
							client: {
								platform: "web",
								version: VOICE_WEB_CLIENT_VERSION,
								binaryWebSocket: true,
								playbackClear: true,
								pcmS16leVerified: true,
								foregroundOnly: false,
								duplex: "full",
								playbackDrainAck: true
							},
							...this.supervisorMode ? {} : { target: { sessionId } },
							...this.supervisorMode && this.butlerId === void 0 ? {} : { butlerId: this.butlerId },
							audio: {
								input: {
									encoding: "pcm_s16le",
									sampleRate: INPUT_SAMPLE_RATE,
									channels: 1,
									frameDurationMs: 40
								},
								output: {
									encoding: "pcm_s16le",
									sampleRate: OUTPUT_SAMPLE_RATE,
									channels: 1,
									frameDurationMs: 40
								}
							},
							...this.snapshot.voiceSessionId === void 0 ? {} : { resume: {
								voiceSessionId: this.snapshot.voiceSessionId,
								lastServerSeq: this.lastServerSeq
							} }
						}));
					};
					socket.onmessage = (event) => {
						if (this.socket === socket && epoch === this.connectionEpoch) this.receive(event);
					};
					socket.onerror = () => {
						if (this.socket !== socket || epoch !== this.connectionEpoch) return;
						this.lastReconnectError = "无法连接 DSH 实时语音插件。";
						this.scheduleReconnect(sessionId);
						rejectOnce(new Error(this.lastReconnectError));
					};
					const ready = (event) => {
						if (this.socket !== socket || epoch !== this.connectionEpoch) return;
						if (typeof event.data !== "string") return;
						const message = JSON.parse(event.data);
						if (message.type === "voice.ready") {
							socket.removeEventListener("message", ready);
							clearTimeout(readyTimeout);
							this.providerReady = true;
							this.startHeartbeat();
							this.reconnectAttempt = 0;
							this.lastReconnectError = void 0;
							if (!settled) {
								settled = true;
								resolve();
							}
						}
						if (message.type === "voice.error" && !message.recoverable) {
							socket.removeEventListener("message", ready);
							this.lastReconnectError = message.message;
							this.scheduleReconnect(sessionId);
							rejectOnce(new Error(message.message));
						}
						if (message.type === "voice.busy") {
							socket.removeEventListener("message", ready);
							const reason = busyMessage(message.occupancy);
							this.lastReconnectError = reason;
							rejectOnce(new Error(reason));
						}
					};
					socket.addEventListener("message", ready);
					socket.onclose = (event) => {
						clearTimeout(readyTimeout);
						socket.removeEventListener("message", ready);
						if (this.socket !== socket || epoch !== this.connectionEpoch) return;
						this.socket = void 0;
						this.providerReady = false;
						this.audio?.clear(this.lastOutputStreamId);
						const reason = event.reason.trim();
						if (this.lastReconnectError === void 0 || reason !== "provider-disconnected") this.lastReconnectError = reason === "" ? `实时语音连接关闭（代码 ${event.code}）。` : `实时语音连接关闭（代码 ${event.code}：${reason}）。`;
						if (!this.ending) this.scheduleReconnect(sessionId);
						rejectOnce(new Error(this.lastReconnectError));
					};
				});
			}
			receive(event) {
				if (event.data instanceof ArrayBuffer) {
					const frame = decodeAudioFrame(event.data);
					if (frame.kind === 2) {
						this.lastOutputStreamId = Math.max(this.lastOutputStreamId, frame.streamId);
						this.audio?.play(frame.payload, frame.streamId);
					}
					return;
				}
				if (typeof event.data !== "string") return;
				const message = JSON.parse(event.data);
				if (!(!this.providerReady && (message.type === "voice.busy" || message.type === "voice.error" && !message.recoverable)) && message.serverSeq <= this.lastServerSeq) return;
				if (message.serverSeq > this.lastServerSeq) this.lastServerSeq = message.serverSeq;
				switch (message.type) {
					case "voice.ready":
						this.update({
							...this.snapshot,
							phase: "listening",
							supervisor: message.protocol === "dsh.voice.supervisor.v1",
							sessionId: message.target.sessionId,
							voiceSessionId: message.voiceSessionId,
							providerModel: message.provider.model,
							turnDetection: message.provider.turnDetection,
							agentRunning: message.target.running,
							error: void 0
						});
						return;
					case "voice.busy":
						this.fail(busyMessage(message.occupancy), false, message.occupancy);
						return;
					case "voice.state":
						this.update({
							...this.snapshot,
							phase: message.phase,
							...message.phase === "thinking" && this.snapshot.phase !== "thinking" ? { assistantTranscript: "" } : {}
						});
						return;
					case "voice.transcript":
						if (message.role === "user") this.update({
							...this.snapshot,
							userTranscript: message.text + (message.stash ?? "")
						});
						else this.update({
							...this.snapshot,
							assistantTranscript: message.final ? message.text : this.snapshot.assistantTranscript + message.text
						});
						return;
					case "voice.playback-clear":
						this.playbackFinalSequences.clear();
						this.lastOutputStreamId = Math.max(this.lastOutputStreamId, message.streamId);
						this.audio?.clear(message.streamId);
						return;
					case "voice.playback-finalize":
						this.playbackFinalSequences.set(message.streamId, message.lastSequence);
						this.audio?.finalize(message.streamId);
						return;
					case "voice.agent-status":
						this.update({
							...this.snapshot,
							agentRunning: message.running,
							...this.supervisorMode ? { sessionId: message.sessionId } : {},
							...message.summary === void 0 ? {} : { agentSummary: message.summary }
						});
						return;
					case "voice.task-selected": {
						this.settleTaskAction();
						const { pendingApproval: _approval, pendingQuestion: _question, ...snapshot } = this.snapshot;
						this.update({
							...snapshot,
							sessionId: message.sessionId,
							agentRunning: message.running,
							error: void 0
						});
						return;
					}
					case "voice.approval":
						if (message.status === "pending") this.update({
							...this.snapshot,
							pendingApproval: message.approval
						});
						else if (this.snapshot.pendingApproval?.approvalId === message.approval.approvalId) {
							const { pendingApproval: _pendingApproval, ...withoutApproval } = this.snapshot;
							this.update(withoutApproval);
						}
						return;
					case "voice.question":
						if (message.status === "pending") this.update({
							...this.snapshot,
							pendingQuestion: message.question
						});
						else if (this.snapshot.pendingQuestion?.requestId === message.question.requestId) {
							const { pendingQuestion: _pendingQuestion, ...withoutQuestion } = this.snapshot;
							this.update(withoutQuestion);
						}
						return;
					case "voice.error":
						this.settleTaskAction(message.message);
						if (message.recoverable) {
							this.lastReconnectError = message.message;
							this.update({
								...this.snapshot,
								error: message.message
							});
						} else this.fail(message.message);
						return;
					case "voice.ended":
						this.end();
						return;
					case "voice.tool":
					case "voice.pong": return;
				}
			}
			sendAudio(pcm) {
				const socket = this.socket;
				if (!this.providerReady || socket?.readyState !== WebSocket.OPEN) return;
				if (socket.bufferedAmount > 4194304) {
					this.lastReconnectError = "浏览器上行语音缓冲超过 4 MiB，正在重连。";
					socket.close(4001, "client-audio-backpressure");
					return;
				}
				const sequence = this.inputSequence++;
				try {
					socket.send(encodeAudioFrame(1, this.inputStreamId, sequence, pcm, { ptsMs: sequence * 40 }));
				} catch (error) {
					this.lastReconnectError = error instanceof Error ? error.message : String(error);
					socket.close(4001, "client-audio-send-failed");
				}
			}
			sendControl(message) {
				if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
			}
			scheduleReconnect(sessionId) {
				if (this.reconnectTimer !== void 0 || this.ending) return;
				if (this.reconnectAttempt >= 8) {
					const detail = this.lastReconnectError === void 0 ? "" : ` 最后原因：${this.lastReconnectError}`;
					this.fail(`实时语音连接多次重试失败，DSH 中已经开始的任务不会被取消。${detail}`, true);
					return;
				}
				const delay = /rate.?limit|限流|代码\s*1007/i.test(this.lastReconnectError ?? "") ? Math.min(6e4, 15e3 * 2 ** this.reconnectAttempt) : Math.min(3e4, 1e3 * 2 ** this.reconnectAttempt);
				this.reconnectAttempt += 1;
				this.update({
					...this.snapshot,
					phase: "reconnecting"
				});
				this.reconnectTimer = setTimeout(() => {
					this.reconnectTimer = void 0;
					this.connect(sessionId).catch((error) => {
						if (!this.ending) this.scheduleReconnect(sessionId);
						if (error instanceof Error) this.update({
							...this.snapshot,
							error: error.message
						});
					});
				}, delay);
			}
			tick() {
				if (this.startedAt === 0) return;
				this.update({
					...this.snapshot,
					elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1e3)
				});
			}
			/** Stop audible output before the server-side VAD event completes its round trip. */
			handleLocalSpeechStart() {
				if (this.snapshot.phase !== "speaking" || this.snapshot.muted || this.snapshot.turnDetection !== "server_vad") return;
				this.audio?.interruptPlayback();
				this.sendControl({
					type: "voice.cancel-response",
					source: "local-vad"
				});
				this.update({
					...this.snapshot,
					phase: "listening"
				});
			}
			async fail(message, preserveResume = false, occupancy) {
				const resumeContext = preserveResume ? localResumeContext(this.snapshot) : void 0;
				this.ending = true;
				await this.cleanup();
				if (resumeContext === void 0) this.resetCallCursors();
				this.update({
					...INITIAL_SNAPSHOT,
					...resumeContext,
					phase: "error",
					error: message,
					...occupancy === void 0 ? {} : { occupancy }
				});
			}
			async cleanup() {
				this.startEpoch += 1;
				this.connectionEpoch += 1;
				if (this.timer !== void 0) clearInterval(this.timer);
				if (this.reconnectTimer !== void 0) clearTimeout(this.reconnectTimer);
				if (this.heartbeatTimer !== void 0) clearInterval(this.heartbeatTimer);
				this.timer = void 0;
				this.reconnectTimer = void 0;
				this.heartbeatTimer = void 0;
				const socket = this.socket;
				this.socket = void 0;
				if (socket !== void 0 && socket.readyState < WebSocket.CLOSING) socket.close(1e3, "voice client closed");
				await this.audio?.close();
				this.audio = void 0;
				this.startedAt = 0;
				this.providerReady = false;
				this.inputSequence = 0;
				this.inputStreamId += 1;
			}
			async refreshPresence() {
				const requestSeq = ++this.presenceRequestSeq;
				try {
					const response = await fetch(VOICE_STATUS_ROUTE, { cache: "no-store" });
					if (!response.ok) return void 0;
					const occupancy = await response.json();
					if (occupancy.protocol !== "dsh.voice.v1" || typeof occupancy.active !== "boolean") return void 0;
					if (requestSeq !== this.presenceRequestSeq) return void 0;
					this.update({
						...this.snapshot,
						occupancy
					});
					this.refreshInbox();
					return occupancy;
				} catch {
					return;
				}
			}
			/**
			* Presence polling already runs every two seconds, so the call-back list
			* rides that cadence instead of opening a second timer.
			*/
			async refreshInbox() {
				const revision = this.inboxRevision;
				try {
					const response = await fetch(VOICE_INBOX_ROUTE, { cache: "no-store" });
					if (!response.ok) return;
					const snapshot = await response.json();
					if (revision !== this.inboxRevision) return;
					if (snapshot.protocol !== "dsh.voice.v1" || !Array.isArray(snapshot.entries)) return;
					const live = new Set(snapshot.entries.map((entry) => entry.id));
					this.update({
						...this.snapshot,
						inbox: snapshot.entries,
						inboxSelection: this.snapshot.inboxSelection.filter((id) => live.has(id)),
						snoozedInbox: [.../* @__PURE__ */ new Set([...this.snapshot.snoozedInbox.filter((id) => live.has(id)), ...snapshot.entries.filter((entry) => entry.snoozed).map((entry) => entry.id)])],
						...snapshot.error === void 0 ? {} : { error: snapshot.error }
					});
				} catch {
					return;
				}
			}
			startHeartbeat() {
				if (this.heartbeatTimer !== void 0) return;
				this.heartbeatTimer = setInterval(() => {
					this.sendControl({
						type: "voice.ping",
						sentAt: Date.now()
					});
				}, 15e3);
			}
			resetCallCursors() {
				this.lastServerSeq = 0;
				this.lastOutputStreamId = 0;
			}
			update(next) {
				this.snapshot = next;
				for (const listener of this.listeners) listener();
			}
		};
		function busyMessage(occupancy) {
			return "实时语音正由另一个客户端占用，请先在该端结束通话。";
		}
		function localResumeContext(snapshot) {
			return snapshot.sessionId === void 0 || snapshot.voiceSessionId === void 0 ? void 0 : {
				sessionId: snapshot.sessionId,
				voiceSessionId: snapshot.voiceSessionId
			};
		}
		/** Presence is authoritative only before this WebUI owns or can resume a call. */
		function isVoiceDialUnavailable(snapshot) {
			const activeTransport = snapshot.phase !== "idle" && snapshot.phase !== "error";
			return snapshot.occupancy?.active === true && !activeTransport && localResumeContext(snapshot) === void 0;
		}
		//#endregion
		//#region src/client/model-settings.ts
		const DEFAULT_API_KEY_REF = "DASHSCOPE_API_KEY";
		const DEFAULT_PROGRESS_MIN_INTERVAL_MS = 45e3;
		const DEFAULT_PROGRESS_QUIET_TASK_MS = 2e4;
		const DEFAULT_VAD_THRESHOLD = .35;
		const DEFAULT_SILENCE_DURATION_MS = 500;
		const DEFAULT_MAX_HISTORY_TURNS = 20;
		const MAX_STYLE_PROMPT_LENGTH = 2e3;
		/** Long enough for a deep absolute path, short enough to stay a setting. */
		const MAX_HANDOFF_SKILL_LENGTH = 512;
		const MAX_HANDOFF_INSTRUCTIONS_LENGTH = 8e3;
		/** Project one durable DSH settings namespace into an immediate two-model switch. */
		var VoiceModelSettingsController = class {
			scope;
			ctx;
			snapshot = {
				available: false,
				writable: false,
				model: DEFAULT_REALTIME_VOICE_MODEL,
				turnDetection: DEFAULT_REALTIME_VOICE_TURN_DETECTION,
				voice: DEFAULT_REALTIME_VOICE_VOICE,
				vadThreshold: DEFAULT_VAD_THRESHOLD,
				silenceDurationMs: DEFAULT_SILENCE_DURATION_MS,
				maxHistoryTurns: DEFAULT_MAX_HISTORY_TURNS,
				enableSpeechEmotion: true,
				stylePrompt: "",
				progressReporting: DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING,
				progressMinIntervalMs: DEFAULT_PROGRESS_MIN_INTERVAL_MS,
				progressQuietTaskMs: DEFAULT_PROGRESS_QUIET_TASK_MS,
				handoffSkill: "",
				handoffInstructions: "",
				supervisorSkill: "",
				supervisorInstructions: "",
				ringDurationMs: DEFAULT_RING_DURATION_MS,
				saving: false,
				error: void 0,
				apiKeyRef: DEFAULT_API_KEY_REF,
				apiKeyConfigured: false,
				apiKeyWritable: true,
				apiKeySaving: false,
				apiKeyError: void 0
			};
			listeners = /* @__PURE__ */ new Set();
			unsubscribe;
			disposed = false;
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.unsubscribe = scope.subscribe(() => {
					this.adoptScope();
				});
				this.adoptScope();
				this.readCredential();
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			async select(model) {
				if (!this.snapshot.available || !this.snapshot.writable || this.snapshot.saving || model === this.snapshot.model) return;
				this.publish({
					...this.snapshot,
					saving: true,
					error: void 0
				});
				try {
					await this.scope.set("model", model);
					if (this.scope.getSnapshot().value?.model !== model) throw new Error("DSH 没有接受该模型设置。");
					this.publish({
						...this.snapshot,
						model,
						saving: false,
						error: void 0
					});
				} catch (error) {
					this.publish({
						...this.snapshot,
						saving: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			async selectTurnDetection(turnDetection) {
				if (!this.snapshot.available || !this.snapshot.writable || this.snapshot.saving || turnDetection === this.snapshot.turnDetection) return;
				this.publish({
					...this.snapshot,
					saving: true,
					error: void 0
				});
				try {
					await this.scope.set("turnDetection", turnDetection);
					if (this.scope.getSnapshot().value?.turnDetection !== turnDetection) throw new Error("DSH 没有接受该打断模式。");
					this.publish({
						...this.snapshot,
						turnDetection,
						saving: false,
						error: void 0
					});
				} catch (error) {
					this.publish({
						...this.snapshot,
						saving: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			async setProgressReporting(progressReporting) {
				await this.writeSetting("progressReporting", progressReporting, "DSH 没有接受该播报粒度。");
			}
			async selectVoice(voice) {
				await this.writeSetting("voice", voice, "DSH 没有接受该音色。");
			}
			async setVadThreshold(vadThreshold) {
				if (!Number.isFinite(vadThreshold) || vadThreshold < -1 || vadThreshold > 1) return;
				await this.writeSetting("vadThreshold", roundTo(vadThreshold, 2), "DSH 没有接受该 VAD 灵敏度。");
			}
			async setSilenceDuration(silenceDurationMs) {
				if (!Number.isInteger(silenceDurationMs) || silenceDurationMs < 200 || silenceDurationMs > 6e3) return;
				await this.writeSetting("silenceDurationMs", silenceDurationMs, "DSH 没有接受该静音时长。");
			}
			async setMaxHistoryTurns(maxHistoryTurns) {
				if (!Number.isInteger(maxHistoryTurns) || maxHistoryTurns < 1 || maxHistoryTurns > 50) return;
				await this.writeSetting("maxHistoryTurns", maxHistoryTurns, "DSH 没有接受该历史轮数。");
			}
			async setSpeechEmotion(enableSpeechEmotion) {
				await this.writeSetting("enableSpeechEmotion", enableSpeechEmotion, "DSH 没有接受该情绪增强设置。");
			}
			async setStylePrompt(stylePrompt) {
				const trimmed = stylePrompt.trim().slice(0, MAX_STYLE_PROMPT_LENGTH);
				await this.writeSetting("stylePrompt", trimmed, "DSH 没有接受该说话风格设置。");
			}
			async setProgressMinInterval(progressMinIntervalMs) {
				if (!Number.isInteger(progressMinIntervalMs) || progressMinIntervalMs < 0 || progressMinIntervalMs > 6e5) return;
				await this.writeSetting("progressMinIntervalMs", progressMinIntervalMs, "DSH 没有接受该播报间隔。");
			}
			async setProgressQuietTask(progressQuietTaskMs) {
				if (!Number.isInteger(progressQuietTaskMs) || progressQuietTaskMs < 0 || progressQuietTaskMs > 6e5) return;
				await this.writeSetting("progressQuietTaskMs", progressQuietTaskMs, "DSH 没有接受该静默阈值。");
			}
			/**
			* Name of a DSH skill that rides along with every execution handoff. Blank
			* clears it. Non empty values are validated on the Host against the live
			* skill registry, so a typo is reported in the transcript rather than
			* silently ignored.
			*/
			async setHandoffSkill(handoffSkill) {
				const trimmed = handoffSkill.trim();
				if (trimmed.length > MAX_HANDOFF_SKILL_LENGTH) return;
				if (trimmed !== "" && !isHandoffSkillOrPath(trimmed)) return;
				await this.writeSetting("handoffSkill", trimmed, "DSH 没有接受该汇报 Skill 设置。");
			}
			async setHandoffInstructions(handoffInstructions) {
				const trimmed = handoffInstructions.trim();
				if (trimmed.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH) return;
				await this.writeSetting("handoffInstructions", trimmed, "DSH 没有接受该汇报指令。");
			}
			async setSupervisorSkill(value) {
				const trimmed = value.trim();
				if (trimmed.length > MAX_HANDOFF_SKILL_LENGTH || trimmed && !isHandoffSkillOrPath(trimmed)) return;
				await this.writeSetting("supervisorSkill", trimmed, "DSH 没有接受语音总管 Skill 设置。");
			}
			async setSupervisorInstructions(value) {
				if (value.trim().length > MAX_HANDOFF_INSTRUCTIONS_LENGTH) return;
				await this.writeSetting("supervisorInstructions", value.trim(), "DSH 没有接受语音总管指令。");
			}
			async setRingDuration(ringDurationMs) {
				if (!Number.isInteger(ringDurationMs) || ringDurationMs < 0 || ringDurationMs > 6e4) return;
				await this.writeSetting("ringDurationMs", ringDurationMs, "DSH 没有接受该响铃时长。");
			}
			/** One write path for the scalar settings that only need a value round-trip. */
			async writeSetting(field, value, mismatchMessage) {
				if (!this.snapshot.available || !this.snapshot.writable || this.snapshot.saving) return;
				if (this.scope.getSnapshot().value?.[field] === value) return;
				this.publish({
					...this.snapshot,
					saving: true,
					error: void 0
				});
				try {
					await this.scope.set(field, value);
					if (this.scope.getSnapshot().value?.[field] !== value) throw new Error(mismatchMessage);
					this.publish({
						...this.snapshot,
						saving: false,
						error: void 0
					});
				} catch (error) {
					this.publish({
						...this.snapshot,
						saving: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			/** Write through DSH's write-only credential seam; the literal is never stored in this controller. */
			async saveApiKey(value) {
				const key = value.trim();
				if (key === "" || !this.snapshot.apiKeyWritable || this.snapshot.apiKeySaving) return false;
				const ref = this.apiKeyRef();
				this.publish({
					...this.snapshot,
					apiKeySaving: true,
					apiKeyError: void 0
				});
				try {
					if (!(await this.ctx.remote.credentials.set(ref, key)).ok) throw new Error("DSH credentials 拒绝了该密钥。");
					await this.readCredential();
					const configured = this.snapshot.apiKeyRef === ref && this.snapshot.apiKeyConfigured;
					this.publish({
						...this.snapshot,
						apiKeySaving: false,
						apiKeyError: configured ? void 0 : "密钥写入后未能确认，请重试。"
					});
					return configured;
				} catch (error) {
					const reason = error instanceof Error ? error.message : String(error);
					this.publish({
						...this.snapshot,
						apiKeySaving: false,
						apiKeyError: `API Key 保存失败：${reason}`
					});
					return false;
				}
			}
			/** Refresh only when the Host reports that this card's credential changed. */
			refreshCredential(ref) {
				if (ref === this.apiKeyRef()) this.readCredential();
			}
			/**
			* Bound scope disposer plus the credential mirror. The injected Context is
			* used only through `remote.credentials`, so a stale context after teardown
			* cannot re-read; `disposed` closes that window explicitly.
			*/
			dispose() {
				this.disposed = true;
				this.unsubscribe();
				this.listeners.clear();
			}
			adoptScope() {
				const scope = this.scope.getSnapshot();
				const model = scope.value?.model;
				const turnDetection = scope.value?.turnDetection;
				const voice = scope.value?.voice ?? "longanqian";
				const vadThreshold = scope.value?.vadThreshold ?? DEFAULT_VAD_THRESHOLD;
				const silenceDurationMs = scope.value?.silenceDurationMs ?? DEFAULT_SILENCE_DURATION_MS;
				const maxHistoryTurns = scope.value?.maxHistoryTurns ?? DEFAULT_MAX_HISTORY_TURNS;
				const enableSpeechEmotion = scope.value?.enableSpeechEmotion ?? true;
				const stylePrompt = scope.value?.stylePrompt ?? "";
				const progressReporting = scope.value?.progressReporting ?? DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING;
				const progressMinIntervalMs = scope.value?.progressMinIntervalMs ?? DEFAULT_PROGRESS_MIN_INTERVAL_MS;
				const progressQuietTaskMs = scope.value?.progressQuietTaskMs ?? DEFAULT_PROGRESS_QUIET_TASK_MS;
				const handoffSkill = scope.value?.handoffSkill ?? "";
				const handoffInstructions = scope.value?.handoffInstructions ?? "";
				const ringDurationMs = scope.value?.ringDurationMs ?? 5e3;
				const previousRef = this.snapshot.apiKeyRef;
				const apiKeyRef = this.apiKeyRef();
				this.publish({
					...this.snapshot,
					available: scope.status === "ready" && isRealtimeVoiceModel(model) && isRealtimeVoiceTurnDetection(turnDetection) && isRealtimeVoiceVoice(voice) && isRealtimeVoiceProgressReporting(progressReporting),
					writable: scope.writable,
					...isRealtimeVoiceModel(model) ? { model } : {},
					...isRealtimeVoiceTurnDetection(turnDetection) ? { turnDetection } : {},
					...isRealtimeVoiceVoice(voice) ? { voice } : {},
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
					supervisorSkill: scope.value?.supervisorSkill ?? "",
					supervisorInstructions: scope.value?.supervisorInstructions ?? "",
					ringDurationMs,
					apiKeyRef,
					...apiKeyRef === previousRef ? {} : { apiKeyConfigured: false }
				});
				if (apiKeyRef !== previousRef) this.readCredential();
			}
			async readCredential() {
				const ref = this.apiKeyRef();
				try {
					const response = await this.ctx.remote.credentials.describe([ref]);
					if (this.disposed || !response.ok || ref !== this.apiKeyRef()) return;
					const credential = response.value[ref];
					this.publish({
						...this.snapshot,
						apiKeyRef: ref,
						apiKeyConfigured: credential?.configured ?? false,
						apiKeyWritable: credential?.writable ?? true
					});
				} catch {
					return;
				}
			}
			apiKeyRef() {
				const declared = this.scope.getSnapshot().value?.apiKeyEnv?.trim();
				return declared === void 0 || declared === "" ? DEFAULT_API_KEY_REF : declared;
			}
			publish(next) {
				this.snapshot = next;
				for (const listener of this.listeners) listener();
			}
		};
		/** Reject malformed remote settings snapshots before they reach the switch. */
		function decodeVoiceModelSettings(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const model = value.model;
			if (!isRealtimeVoiceModel(model)) return void 0;
			const rawTurnDetection = value.turnDetection;
			const turnDetection = rawTurnDetection === void 0 ? DEFAULT_REALTIME_VOICE_TURN_DETECTION : rawTurnDetection;
			if (!isRealtimeVoiceTurnDetection(turnDetection)) return void 0;
			const apiKeyEnv = value.apiKeyEnv;
			if (apiKeyEnv !== void 0 && (typeof apiKeyEnv !== "string" || apiKeyEnv.trim() === "")) return void 0;
			const rawProgressReporting = value.progressReporting;
			const progressReporting = rawProgressReporting === void 0 ? DEFAULT_REALTIME_VOICE_PROGRESS_REPORTING : rawProgressReporting;
			if (!isRealtimeVoiceProgressReporting(progressReporting)) return void 0;
			const progressMinIntervalMs = optionalBoundedInteger(value.progressMinIntervalMs, DEFAULT_PROGRESS_MIN_INTERVAL_MS);
			const progressQuietTaskMs = optionalBoundedInteger(value.progressQuietTaskMs, DEFAULT_PROGRESS_QUIET_TASK_MS);
			if (progressMinIntervalMs === void 0 || progressQuietTaskMs === void 0) return void 0;
			const rawVoice = value.voice;
			const voice = rawVoice === void 0 ? DEFAULT_REALTIME_VOICE_VOICE : rawVoice;
			if (!isRealtimeVoiceVoice(voice)) return void 0;
			const vadThreshold = optionalBoundedNumber(value.vadThreshold, DEFAULT_VAD_THRESHOLD, -1, 1);
			const silenceDurationMs = optionalBoundedInteger(value.silenceDurationMs, DEFAULT_SILENCE_DURATION_MS, 200, 6e3);
			const maxHistoryTurns = optionalBoundedInteger(value.maxHistoryTurns, DEFAULT_MAX_HISTORY_TURNS, 1, 50);
			if (vadThreshold === void 0 || silenceDurationMs === void 0 || maxHistoryTurns === void 0) return void 0;
			const rawSpeechEmotion = value.enableSpeechEmotion;
			if (rawSpeechEmotion !== void 0 && typeof rawSpeechEmotion !== "boolean") return void 0;
			const rawStylePrompt = value.stylePrompt;
			if (rawStylePrompt !== void 0 && (typeof rawStylePrompt !== "string" || rawStylePrompt.length > MAX_STYLE_PROMPT_LENGTH)) return void 0;
			const rawHandoffSkill = value.handoffSkill;
			if (rawHandoffSkill !== void 0 && (typeof rawHandoffSkill !== "string" || rawHandoffSkill.length > MAX_HANDOFF_SKILL_LENGTH)) return void 0;
			const rawHandoffInstructions = value.handoffInstructions;
			if (rawHandoffInstructions !== void 0 && (typeof rawHandoffInstructions !== "string" || rawHandoffInstructions.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH)) return void 0;
			const rawRingDuration = value.ringDurationMs;
			const supervisorSkill = value.supervisorSkill ?? "";
			const supervisorInstructions = value.supervisorInstructions ?? "";
			if (typeof supervisorSkill !== "string" || supervisorSkill.length > MAX_HANDOFF_SKILL_LENGTH || typeof supervisorInstructions !== "string" || supervisorInstructions.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH) return void 0;
			if (rawRingDuration !== void 0 && (typeof rawRingDuration !== "number" || !Number.isInteger(rawRingDuration) || rawRingDuration < 0 || rawRingDuration > 6e4)) return void 0;
			return {
				model,
				turnDetection,
				voice,
				vadThreshold,
				silenceDurationMs,
				maxHistoryTurns,
				enableSpeechEmotion: rawSpeechEmotion ?? true,
				stylePrompt: rawStylePrompt ?? "",
				progressReporting,
				progressMinIntervalMs,
				progressQuietTaskMs,
				handoffSkill: rawHandoffSkill ?? "",
				handoffInstructions: rawHandoffInstructions ?? "",
				supervisorSkill,
				supervisorInstructions,
				ringDurationMs: rawRingDuration ?? 5e3,
				...typeof apiKeyEnv === "string" ? { apiKeyEnv } : {}
			};
		}
		function optionalBoundedInteger(value, fallback, min = 0, max = 6e5) {
			if (value === void 0) return fallback;
			if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return void 0;
			return value;
		}
		/**
		* The field accepts either a DSH skill name (kebab-case, no separators) or a
		* path to a markdown file. Anything else is rejected before the write rather
		* than silently producing guidance that can never resolve.
		*/
		function isHandoffSkillOrPath(value) {
			if (/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value)) return true;
			if (value.includes("\0") || value.length > MAX_HANDOFF_SKILL_LENGTH) return false;
			return value.includes("/") || value.includes("\\") || value.startsWith("~");
		}
		function optionalBoundedNumber(value, fallback, min, max) {
			if (value === void 0) return fallback;
			if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return void 0;
			return value;
		}
		function roundTo(value, digits) {
			const factor = 10 ** digits;
			return Math.round(value * factor) / factor;
		}
		//#endregion
		//#region \0dsh-voice-css:/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice/src/client/voice.module.css.mjs
		const css = ".av_iAa_callButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);cursor:pointer;border:0;border-radius:999px;flex:none;order:100;place-items:center;width:34px;height:34px;padding:0;transition:color .12s,background .12s,transform .12s,box-shadow .12s;display:inline-grid;transform:translateY(-2px)}.av_iAa_callButton:hover{background:var(--dsw-alias-button-info-hover,#2f55dc)}.av_iAa_callButton:active{transform:translateY(-2px)scale(.94)}.av_iAa_callButton:disabled{color:color-mix(in srgb, currentColor 48%, transparent);background:color-mix(in srgb, var(--dsw-alias-surface-secondary,#eef0f5) 90%, transparent);cursor:not-allowed;box-shadow:none}.av_iAa_callButtonActive{color:var(--dsw-alias-button-danger-text,#fff);background:var(--dsw-alias-button-danger-fill,#e5484d);box-shadow:0 0 0 4px color-mix(in srgb, var(--dsw-alias-button-danger-fill,#e5484d) 18%, transparent)}.av_iAa_icon{fill:none;stroke:currentColor;stroke-width:1.55px;stroke-linecap:round;stroke-linejoin:round;width:17px;height:17px}.av_iAa_stopGlyph{background:currentColor;border-radius:2px;width:8px;height:8px}.av_iAa_overlay{border:1px solid var(--dsw-alias-border-subtle);width:min(372px,100vw - 40px);max-height:min(620px,100vh - 24px);color:var(--dsw-alias-text-primary);background:color-mix(in srgb, var(--dsw-alias-surface-primary) 94%, transparent);backdrop-filter:blur(18px);will-change:left, top;border-radius:18px;flex-direction:column;padding:16px;display:flex;position:fixed;top:72px;right:20px;overflow:hidden;box-shadow:0 18px 56px #0000002e}.av_iAa_overlayError{gap:14px;width:min(372px,100vw - 40px)}.av_iAa_dragHandle,.av_iAa_voiceOrb{touch-action:none;user-select:none;cursor:grab}.av_iAa_dragging,.av_iAa_dragging .av_iAa_dragHandle{cursor:grabbing;transition:none!important}.av_iAa_voiceOrb{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-surface-primary,#fff) 88%, transparent);width:76px;height:76px;box-shadow:0 14px 38px #00000038, 0 0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 10%, transparent);backdrop-filter:blur(18px);will-change:left, top;border-radius:50%;padding:0;position:fixed;bottom:20px;right:20px;overflow:hidden}.av_iAa_voiceOrb[data-phase=speaking]{box-shadow:0 14px 38px #00000038, 0 0 0 8px color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 17%, transparent)}.av_iAa_orbButton{border-radius:inherit;color:#fff;width:100%;height:100%;cursor:inherit;background:radial-gradient(circle at 35% 28%,#7390ff 0,#3964fe 44%,#2747c9 100%);border:0;place-content:center;gap:5px;padding:0;display:grid}.av_iAa_orbWaves{justify-content:center;align-items:center;gap:3px;height:22px;display:flex}.av_iAa_orbWaves i{opacity:.92;background:currentColor;border-radius:999px;width:3px;height:8px;animation:.85s ease-in-out infinite alternate av_iAa_voice-wave;display:block}.av_iAa_orbWaves i:nth-child(2),.av_iAa_orbWaves i:nth-child(4){height:15px;animation-delay:-240ms}.av_iAa_orbWaves i:nth-child(3){height:21px;animation-delay:-420ms}.av_iAa_voiceOrb[data-phase=listening] .av_iAa_orbWaves i,.av_iAa_voiceOrb[data-phase=agent-working] .av_iAa_orbWaves i{animation-duration:1.25s}.av_iAa_orbTime{font-variant-numeric:tabular-nums;opacity:.86;font-size:10px}@keyframes av_iAa_voice-wave{0%{opacity:.62;transform:scaleY(.55)}to{opacity:1;transform:scaleY(1.15)}}.av_iAa_overlayHeader,.av_iAa_controls{justify-content:space-between;align-items:center;gap:10px;display:flex}.av_iAa_overlayHeader{border-radius:12px;margin:-8px -8px 0;padding:8px}.av_iAa_headerActions{align-items:center;gap:8px;display:flex}.av_iAa_iconButton{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));width:28px;height:28px;color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-surface-primary));cursor:pointer;border-radius:999px;font-size:20px;line-height:1}.av_iAa_eyebrow{color:var(--dsw-alias-text-secondary);margin-bottom:4px;font-size:12px;font-weight:600}.av_iAa_phaseLine{align-items:center;gap:7px;font-size:15px;font-weight:600;display:flex}.av_iAa_liveDot{background:var(--dsw-alias-status-success,#30a46c);width:8px;height:8px;box-shadow:0 0 0 5px color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 18%, transparent);border-radius:50%}.av_iAa_agentState{color:var(--dsw-alias-text-secondary);background:var(--dsw-alias-fill-subtle);border-radius:999px;padding:6px 10px;font-size:12px}.av_iAa_bindingCard{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-fill-subtle));border-radius:12px;margin-top:14px;padding:12px}.av_iAa_bindingLabel,.av_iAa_speakerLabel{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:11px;font-weight:600}.av_iAa_bindingTitle{color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));text-overflow:ellipsis;white-space:nowrap;margin-top:3px;font-size:14px;font-weight:600;overflow:hidden}.av_iAa_bindingMeta{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin-top:5px;font-size:11px;line-height:1.45}.av_iAa_returnLink{color:var(--dsw-alias-brand-primary,#3964fe);cursor:pointer;background:0 0;border:0;margin-top:8px;padding:0;font-size:12px}.av_iAa_transcripts{align-content:start;gap:12px;min-height:120px;max-height:230px;margin:14px 0;padding:2px 4px 2px 2px;display:grid;overflow-y:auto}.av_iAa_transcriptBlock{background:var(--dsw-alias-fill-subtle,var(--dsw-alias-bg-layer-3));border-radius:12px;gap:4px;padding:10px 12px;display:grid}.av_iAa_userText,.av_iAa_assistantText{margin:0;line-height:1.5}.av_iAa_userText{color:var(--dsw-alias-text-secondary);font-size:13px}.av_iAa_assistantText{font-size:15px}.av_iAa_agentSummary{border-left:3px solid var(--dsw-alias-brand-primary,#3964fe);max-height:120px;color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-fill-subtle));border-radius:0 10px 10px 0;gap:5px;margin-bottom:12px;padding:10px 12px;font-size:12px;line-height:1.5;display:grid;overflow-y:auto}.av_iAa_interactionCard{border:1px solid color-mix(in srgb, var(--dsw-alias-status-warning,#f2a20c) 55%, var(--dsw-alias-border-subtle));background:color-mix(in srgb, var(--dsw-alias-status-warning,#f2a20c) 8%, var(--dsw-alias-surface-primary));border-radius:12px;gap:8px;max-height:230px;margin-bottom:12px;padding:11px 12px;font-size:12px;display:grid;overflow-y:auto}.av_iAa_interactionTitle{font-size:13px;font-weight:600}.av_iAa_interactionDetail{color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));margin:0;line-height:1.45}.av_iAa_interactionActions{justify-content:flex-end;gap:8px;display:flex}.av_iAa_allowButton,.av_iAa_rejectButton{font:inherit;cursor:pointer;border:1px solid #0000;border-radius:999px;padding:6px 11px}.av_iAa_allowButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe)}.av_iAa_rejectButton{color:var(--dsw-alias-text-primary);border-color:var(--dsw-alias-border-subtle);background:var(--dsw-alias-surface-primary)}.av_iAa_questionBlock{border-top:1px solid var(--dsw-alias-border-subtle);gap:6px;padding-top:7px;display:grid}.av_iAa_questionOption{cursor:pointer;align-items:flex-start;gap:7px;line-height:1.4;display:flex}.av_iAa_questionCustom{border:1px solid var(--dsw-alias-border-subtle);min-width:0;height:32px;color:var(--dsw-alias-text-primary);background:var(--dsw-alias-surface-primary);font:inherit;border-radius:8px;padding:0 9px}.av_iAa_controls{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));flex-wrap:wrap;justify-content:flex-end;margin-top:auto;padding-top:12px}.av_iAa_secondaryButton,.av_iAa_endButton{border:1px solid var(--dsw-alias-border-subtle);color:var(--dsw-alias-text-primary);background:var(--dsw-alias-surface-primary);cursor:pointer;border-radius:999px;padding:7px 12px}.av_iAa_endButton{color:#fff;background:var(--dsw-alias-button-danger-fill,#e5484d);border-color:#0000}.av_iAa_inlineError,.av_iAa_errorText{color:var(--dsw-alias-status-danger-text,#d13438);font-size:13px}.av_iAa_errorText{flex:1}.av_iAa_settingsCard{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-surface-primary));border-radius:12px;list-style:none}.av_iAa_settingsCardHeader{align-items:center;gap:12px;padding:14px 16px;display:flex}.av_iAa_settingsCardIcon{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);border-radius:10px;flex:none;place-items:center;width:34px;height:34px;display:grid}.av_iAa_settingsCardHeading{gap:3px;min-width:0;display:grid}.av_iAa_settingsCardHeading strong{font-size:15px}.av_iAa_settingsCardHeading span{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:13px;line-height:1.45}.av_iAa_settingsCardBody{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin:0 16px;padding:14px 0 16px}.av_iAa_settingsLabel{margin-bottom:9px;font-size:13px;font-weight:600}.av_iAa_modelSwitch{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.av_iAa_modelSwitchThree{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;display:grid}.av_iAa_modelChoice{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));min-width:0;color:inherit;background:var(--dsw-alias-bg-layer-2,transparent);text-align:left;cursor:pointer;border-radius:10px;padding:11px 34px 11px 12px;position:relative}.av_iAa_modelChoiceSelected{border-color:var(--dsw-alias-brand-primary,#3964fe);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_modelChoice:disabled{opacity:.55;cursor:default}.av_iAa_modelChoiceTitle,.av_iAa_modelChoiceDetail{display:block}.av_iAa_modelChoiceTitle{font-size:14px;font-weight:600}.av_iAa_modelChoiceDetail{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin-top:4px;font-size:11px;line-height:1.4}.av_iAa_radioDot{border:1px solid var(--dsw-alias-label-dimmed,#8a8f98);border-radius:50%;width:12px;height:12px;position:absolute;top:13px;right:12px}.av_iAa_modelChoiceSelected .av_iAa_radioDot{border:4px solid var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_settingsHint,.av_iAa_settingsError{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin:9px 0 0;font-size:12px;line-height:1.5}.av_iAa_settingsSubsection{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin-top:14px;padding-top:14px}.av_iAa_settingsError{color:var(--dsw-alias-label-error,#d13438)}.av_iAa_numberRow{gap:12px;margin-top:12px;display:flex}.av_iAa_numberField{flex:1;gap:6px;min-width:0;display:grid}.av_iAa_numberFieldLabel{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:12px}.av_iAa_numberFieldInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));border-radius:8px;align-items:center;gap:6px;height:34px;padding:0 10px;display:flex}.av_iAa_numberInput{width:100%;min-width:0;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));font:inherit;background:0 0;border:0;outline:none;font-size:13px}.av_iAa_numberSuffix{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));flex:none;font-size:12px}.av_iAa_numberFieldInput:has(.av_iAa_numberInput:disabled){opacity:.5}.av_iAa_selectField{gap:6px;display:grid}.av_iAa_selectInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));height:34px;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;padding:0 10px;font-size:13px}.av_iAa_voicePreviewRow{align-items:center;gap:8px;display:flex}.av_iAa_voicePreviewRow .av_iAa_selectInput{flex:1;min-width:0}.av_iAa_previewButton{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));min-width:68px;height:34px;color:var(--dsw-alias-brand-primary,#3964fe);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;cursor:pointer;border-radius:8px;flex:none;padding:0 12px;font-size:13px}.av_iAa_previewButton:disabled{opacity:.5;cursor:default}.av_iAa_selectInput:disabled{opacity:.5}.av_iAa_toggleRow{align-items:center;gap:8px;height:34px;display:flex}.av_iAa_toggle{background:var(--dsw-alias-border-l2,#d5d8de);cursor:pointer;border:0;border-radius:11px;flex:none;width:40px;height:22px;padding:0;transition:background .15s;position:relative}.av_iAa_toggle:disabled{opacity:.5;cursor:default}.av_iAa_toggleOn{background:var(--dsw-alias-button-info-fill,#3964fe)}.av_iAa_toggleKnob{background:#fff;border-radius:50%;width:18px;height:18px;transition:transform .15s;position:absolute;top:2px;left:2px}.av_iAa_toggleOn .av_iAa_toggleKnob{transform:translate(18px)}.av_iAa_toggleCaption{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:12px}.av_iAa_styleField{gap:6px;margin-top:12px;display:grid}.av_iAa_styleInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));resize:vertical;width:100%;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;outline:none;padding:9px 10px;font-size:13px;line-height:1.5}.av_iAa_styleInput:focus{border-color:var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_styleInput:disabled{opacity:.5}.av_iAa_credentialSection{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin-top:14px;padding-top:14px}.av_iAa_credentialStatus{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));align-items:center;gap:7px;margin-bottom:9px;font-size:12px;display:flex}.av_iAa_credentialDot{background:var(--dsw-alias-label-error,#d13438);border-radius:50%;flex:none;width:7px;height:7px}.av_iAa_credentialStatus[data-configured] .av_iAa_credentialDot{background:var(--dsw-alias-status-success,#30a46c);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 14%, transparent)}.av_iAa_credentialInputRow{gap:8px;display:flex}.av_iAa_credentialInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));min-width:0;height:36px;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;outline:none;flex:1;padding:0 11px;font-size:13px}.av_iAa_credentialInput:focus{border-color:var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_credentialSave{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);height:36px;font:inherit;cursor:pointer;border:0;border-radius:8px;flex:none;padding:0 13px;font-size:13px}.av_iAa_credentialSave:disabled,.av_iAa_credentialInput:disabled{opacity:.5;cursor:default}.av_iAa_overlayIncoming{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 42%, transparent);gap:10px;box-shadow:0 18px 42px #0f172a38}.av_iAa_incomingHeader{cursor:grab;justify-content:space-between;align-items:flex-start;gap:10px;display:flex}.av_iAa_ringDot{background:var(--dsw-alias-button-info-fill,#3964fe);border-radius:999px;width:8px;height:8px;animation:1.4s ease-out infinite av_iAa_ringPulse;box-shadow:0 0 #3964fe8c}@keyframes av_iAa_ringPulse{0%{box-shadow:0 0 #3964fe8c}70%{box-shadow:0 0 0 9px #3964fe00}to{box-shadow:0 0 #3964fe00}}.av_iAa_incomingList{flex-direction:column;gap:6px;max-height:260px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.av_iAa_incomingRow{border:1px solid var(--dsw-alias-border-secondary,#0f172a1a);background:var(--dsw-alias-bg-secondary,#0f172a05);border-radius:10px;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.av_iAa_incomingLabel{grid-template-columns:18px minmax(0,1fr);align-items:center;gap:8px;min-width:0;display:grid}.av_iAa_rowCheck{border:1px solid var(--dsw-alias-border-secondary,#0f172a40);background:var(--dsw-alias-bg-primary,#fff);color:#fff;cursor:pointer;border-radius:5px;flex:none;place-items:center;width:18px;min-width:18px;max-width:18px;height:18px;padding:0;font-size:11px;line-height:1;display:grid}.av_iAa_rowCheckOn{border-color:var(--dsw-alias-button-info-fill,#3964fe);background:var(--dsw-alias-button-info-fill,#3964fe)}.av_iAa_rowCheck:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3964fe);outline-offset:1px}.av_iAa_rowAnswer{background:var(--dsw-alias-button-info-fill,#3964fe);color:#fff;font:inherit;cursor:pointer;border:0;border-radius:999px;flex:none;padding:2px 10px;font-size:11px}.av_iAa_rowAction{border:1px solid var(--dsw-alias-border-secondary,#0f172a29);color:var(--dsw-alias-text-secondary,#475569);font:inherit;cursor:pointer;background:0 0;border-radius:999px;flex:none;padding:2px 8px;font-size:11px}.av_iAa_incomingTitle{min-width:0;color:var(--dsw-alias-text-primary,#0f172a);text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;overflow:hidden}.av_iAa_incomingMeta{color:var(--dsw-alias-text-tertiary,#64748b);text-overflow:ellipsis;white-space:nowrap;align-items:center;gap:6px;font-size:12px;display:flex;overflow:hidden}.av_iAa_incomingStatus{color:var(--dsw-alias-brand-primary,#3964fe);background:#3964fe1f;border-radius:999px;flex:none;padding:1px 6px;font-size:11px}.av_iAa_incomingStatus[data-status=failed]{color:#dc2626;background:#dc26261f}.av_iAa_incomingStatus[data-status=cancelled]{color:#64748b;background:#64748b29}.av_iAa_incomingActions{color:var(--dsw-alias-text-tertiary,#94a3b8);flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;display:flex}.av_iAa_incomingTime{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.av_iAa_linkButton{color:var(--dsw-alias-brand-primary,#3964fe);font:inherit;cursor:pointer;background:0 0;border:0;flex:none;padding:0;font-size:11px}.av_iAa_incomingFooter{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.av_iAa_answerButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);min-width:96px;height:34px;font:inherit;cursor:pointer;border:0;border-radius:999px;flex:1;font-size:13px}.av_iAa_answerButton:disabled{opacity:.5;cursor:default}.av_iAa_incomingHint{color:var(--dsw-alias-text-tertiary,#94a3b8);flex-basis:100%;font-size:11px}.av_iAa_incomingNotice{color:var(--dsw-alias-text-secondary,#475569);background:#3964fe14;border-radius:8px;padding:6px 10px;font-size:12px}@media (width<=1199px){.av_iAa_overlay{border-radius:16px;width:min(420px,100vw - 24px);max-height:min(560px,100vh - 24px);padding:14px;top:auto;bottom:12px;right:12px}.av_iAa_voiceOrb{bottom:12px;right:12px}.av_iAa_controls{justify-content:stretch}.av_iAa_secondaryButton,.av_iAa_endButton{flex:1}}@media (width<=520px){.av_iAa_modelSwitch,.av_iAa_modelSwitchThree{grid-template-columns:1fr}.av_iAa_numberRow{flex-direction:column;gap:10px}}.av_iAa_readConfirmation{border:1px solid;border-radius:8px;margin:8px 0;padding:12px}.av_iAa_readConfirmation p{margin:0 0 8px}.av_iAa_readConfirmation button+button{margin-left:8px}.av_iAa_launcher{z-index:1000;color:var(--dsw-alias-text-primary,#e8e8ed);font-size:13px;position:fixed;bottom:20px;right:20px}.av_iAa_dialBall{border:1px solid var(--dsw-alias-accent-emphasis,#5b8cff);width:34px;height:34px;color:var(--dsw-alias-text-primary,#e8e8ed);background:var(--dsw-alias-bg-layer-3,#22232a);cursor:pointer;touch-action:none;border-radius:999px;place-items:center;padding:0;display:grid;position:relative;box-shadow:0 2px 10px #0004}.av_iAa_dialBall:hover{border-color:var(--dsw-alias-accent-emphasis-hover,#7aa2ff)}.av_iAa_dialBall:disabled{opacity:.6;cursor:not-allowed}.av_iAa_dialBallGlyph{background:var(--dsw-alias-accent-emphasis,#5b8cff);clip-path:polygon(30% 8%,70% 8%,70% 34%,88% 46%,88% 60%,70% 48%,70% 92%,30% 92%,30% 48%,12% 60%,12% 46%,30% 34%);border-radius:4px;width:15px;height:15px}.av_iAa_dialBallActive{border-color:var(--dsw-alias-status-success,#30a46c);animation:1.6s ease-in-out infinite av_iAa_dial-pulse}.av_iAa_dialBallActive .av_iAa_dialBallGlyph{background:var(--dsw-alias-status-success,#30a46c)}@keyframes av_iAa_dial-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 46%, transparent)}70%{box-shadow:0 0 0 12px color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 0%, transparent)}to{box-shadow:0 0 0 0 color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 0%, transparent)}}.av_iAa_launcherMenu{background:var(--dsw-alias-surface-primary,#22232a);border:1px solid #737580;border-radius:12px;width:min(360px,100vw - 40px);max-height:calc(100vh - 100px);padding:16px;position:absolute;bottom:44px;right:0;overflow:auto;box-shadow:0 8px 32px #0005}.av_iAa_launcherMenu label{gap:6px;margin:12px 0;display:grid}.av_iAa_launcherMenu select,.av_iAa_launcherMenu input{box-sizing:border-box;width:100%;min-width:0}.av_iAa_launcherTasks{gap:6px;max-height:180px;display:grid;overflow:auto}.av_iAa_launcherTasks button{text-align:left;overflow-wrap:anywhere}";
		const styleId = "@harness-remote/dsh-realtime-voice/voice.module.css";
		if (typeof document !== "undefined" && !document.querySelector(`style[data-plugin-css="${styleId}"]`)) {
			const style = document.createElement("style");
			style.dataset.plugin = "@harness-remote/dsh-realtime-voice";
			style.dataset.pluginCss = styleId;
			style.textContent = css;
			document.head.appendChild(style);
		}
		var voice_module_css_default = {
			"toggleRow": "av_iAa_toggleRow",
			"questionCustom": "av_iAa_questionCustom",
			"transcripts": "av_iAa_transcripts",
			"agentState": "av_iAa_agentState",
			"transcriptBlock": "av_iAa_transcriptBlock",
			"dragging": "av_iAa_dragging",
			"interactionDetail": "av_iAa_interactionDetail",
			"bindingTitle": "av_iAa_bindingTitle",
			"questionOption": "av_iAa_questionOption",
			"phaseLine": "av_iAa_phaseLine",
			"callButton": "av_iAa_callButton",
			"dialBall": "av_iAa_dialBall",
			"bindingCard": "av_iAa_bindingCard",
			"orbTime": "av_iAa_orbTime",
			"numberFieldInput": "av_iAa_numberFieldInput",
			"settingsCardBody": "av_iAa_settingsCardBody",
			"overlayIncoming": "av_iAa_overlayIncoming",
			"overlayError": "av_iAa_overlayError",
			"dial-pulse": "av_iAa_dial-pulse",
			"errorText": "av_iAa_errorText",
			"modelSwitchThree": "av_iAa_modelSwitchThree",
			"bindingLabel": "av_iAa_bindingLabel",
			"numberField": "av_iAa_numberField",
			"rowAnswer": "av_iAa_rowAnswer",
			"credentialSave": "av_iAa_credentialSave",
			"bindingMeta": "av_iAa_bindingMeta",
			"stopGlyph": "av_iAa_stopGlyph",
			"credentialSection": "av_iAa_credentialSection",
			"interactionActions": "av_iAa_interactionActions",
			"selectInput": "av_iAa_selectInput",
			"settingsError": "av_iAa_settingsError",
			"answerButton": "av_iAa_answerButton",
			"launcherMenu": "av_iAa_launcherMenu",
			"settingsLabel": "av_iAa_settingsLabel",
			"settingsCardHeading": "av_iAa_settingsCardHeading",
			"ringDot": "av_iAa_ringDot",
			"modelChoiceTitle": "av_iAa_modelChoiceTitle",
			"allowButton": "av_iAa_allowButton",
			"questionBlock": "av_iAa_questionBlock",
			"incomingTime": "av_iAa_incomingTime",
			"modelChoice": "av_iAa_modelChoice",
			"overlayHeader": "av_iAa_overlayHeader",
			"voiceOrb": "av_iAa_voiceOrb",
			"modelChoiceSelected": "av_iAa_modelChoiceSelected",
			"selectField": "av_iAa_selectField",
			"toggleCaption": "av_iAa_toggleCaption",
			"rowAction": "av_iAa_rowAction",
			"dialBallActive": "av_iAa_dialBallActive",
			"numberFieldLabel": "av_iAa_numberFieldLabel",
			"incomingHint": "av_iAa_incomingHint",
			"previewButton": "av_iAa_previewButton",
			"orbWaves": "av_iAa_orbWaves",
			"styleField": "av_iAa_styleField",
			"credentialDot": "av_iAa_credentialDot",
			"rowCheckOn": "av_iAa_rowCheckOn",
			"linkButton": "av_iAa_linkButton",
			"dragHandle": "av_iAa_dragHandle",
			"ringPulse": "av_iAa_ringPulse",
			"radioDot": "av_iAa_radioDot",
			"controls": "av_iAa_controls",
			"launcherTasks": "av_iAa_launcherTasks",
			"icon": "av_iAa_icon",
			"returnLink": "av_iAa_returnLink",
			"incomingMeta": "av_iAa_incomingMeta",
			"callButtonActive": "av_iAa_callButtonActive",
			"inlineError": "av_iAa_inlineError",
			"modelSwitch": "av_iAa_modelSwitch",
			"settingsSubsection": "av_iAa_settingsSubsection",
			"userText": "av_iAa_userText",
			"agentSummary": "av_iAa_agentSummary",
			"numberInput": "av_iAa_numberInput",
			"modelChoiceDetail": "av_iAa_modelChoiceDetail",
			"numberSuffix": "av_iAa_numberSuffix",
			"voicePreviewRow": "av_iAa_voicePreviewRow",
			"toggle": "av_iAa_toggle",
			"liveDot": "av_iAa_liveDot",
			"incomingStatus": "av_iAa_incomingStatus",
			"headerActions": "av_iAa_headerActions",
			"styleInput": "av_iAa_styleInput",
			"toggleOn": "av_iAa_toggleOn",
			"rowCheck": "av_iAa_rowCheck",
			"incomingRow": "av_iAa_incomingRow",
			"speakerLabel": "av_iAa_speakerLabel",
			"credentialInputRow": "av_iAa_credentialInputRow",
			"interactionTitle": "av_iAa_interactionTitle",
			"incomingLabel": "av_iAa_incomingLabel",
			"rejectButton": "av_iAa_rejectButton",
			"interactionCard": "av_iAa_interactionCard",
			"eyebrow": "av_iAa_eyebrow",
			"endButton": "av_iAa_endButton",
			"toggleKnob": "av_iAa_toggleKnob",
			"launcher": "av_iAa_launcher",
			"numberRow": "av_iAa_numberRow",
			"readConfirmation": "av_iAa_readConfirmation",
			"credentialStatus": "av_iAa_credentialStatus",
			"iconButton": "av_iAa_iconButton",
			"assistantText": "av_iAa_assistantText",
			"incomingTitle": "av_iAa_incomingTitle",
			"voice-wave": "av_iAa_voice-wave",
			"secondaryButton": "av_iAa_secondaryButton",
			"settingsHint": "av_iAa_settingsHint",
			"dialBallGlyph": "av_iAa_dialBallGlyph",
			"orbButton": "av_iAa_orbButton",
			"incomingNotice": "av_iAa_incomingNotice",
			"incomingFooter": "av_iAa_incomingFooter",
			"settingsCard": "av_iAa_settingsCard",
			"incomingHeader": "av_iAa_incomingHeader",
			"credentialInput": "av_iAa_credentialInput",
			"settingsCardHeader": "av_iAa_settingsCardHeader",
			"settingsCardIcon": "av_iAa_settingsCardIcon",
			"incomingList": "av_iAa_incomingList",
			"overlay": "av_iAa_overlay",
			"incomingActions": "av_iAa_incomingActions"
		};
		//#endregion
		//#region src/client/VoiceButton.tsx
		/** Compact call control in the official composer right-hand action slot. */
		function VoiceButton({ useVoice, toggle }) {
			const phase = useVoice((snapshot) => snapshot.phase);
			const unavailable = useVoice(isVoiceDialUnavailable);
			const active = phase !== "idle" && phase !== "error";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${voice_module_css_default.callButton} ${active ? voice_module_css_default.callButtonActive : ""}`,
				"aria-label": active ? "结束实时语音" : unavailable ? "实时语音已被其他客户端占用" : "开始实时语音",
				title: active ? "结束实时语音" : unavailable ? "另一端正在使用实时语音" : "实时语音",
				disabled: unavailable,
				onClick: toggle,
				children: active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: voice_module_css_default.stopGlyph }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallGlyph, {})
			});
		}
		function CallGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				className: voice_module_css_default.icon,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					stroke: "none",
					d: "M7.2 3.75 9.6 7.7 7.95 9.3c1.2 2.55 3.2 4.55 5.75 5.75l1.6-1.65 3.95 2.4-.55 3.4c-.14.85-.9 1.45-1.76 1.39C9.8 20.08 3.92 14.2 3.41 7.06A1.68 1.68 0 0 1 4.8 5.3l2.4-1.55Z"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "none",
					d: "M14.2 5.8c1.85.46 3.54 2.15 4 4M14.55 2.5c3.45.58 6.37 3.5 6.95 6.95"
				})]
			});
		}
		//#endregion
		//#region src/client/CallBackList.tsx
		function CallBackList(props) {
			const [confirmIds, setConfirmIds] = (0, react.useState)([]);
			const allSelected = props.selection.length === props.waiting.length && props.waiting.length > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: voice_module_css_default.incomingHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: voice_module_css_default.eyebrow,
						children: "DSH 实时语音"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.phaseLine,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: voice_module_css_default.ringDot }), pendingCount(props.waiting) === 0 ? `${props.waiting.length} 个任务已完成，等待汇报` : `${pendingCount(props.waiting)} 个问题等你回答${props.waiting.length - pendingCount(props.waiting) === 0 ? "" : `，另有 ${props.waiting.length - pendingCount(props.waiting)} 个任务可汇报`}`]
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: voice_module_css_default.iconButton,
						"aria-label": "清空选择",
						title: "清空选择",
						onClick: props.onClearSelection,
						children: "×"
					})]
				}),
				confirmIds.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					role: "alertdialog",
					"aria-label": "确认标记已读",
					className: voice_module_css_default.readConfirmation,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
							"将 ",
							confirmIds.length,
							" 条记录标记已读？仅从待汇报列表移除，DSH 会话不会删除。"
						] }),
						props.waiting.some((entry) => confirmIds.includes(entry.id) && entry.kind === "needs-input") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "待回答的问题将交还 DSH 文字界面，不代表同意或拒绝。" }) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							onClick: () => setConfirmIds([]),
							children: "取消"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							onClick: () => {
								props.onDismiss(confirmIds);
								setConfirmIds([]);
							},
							children: "确认已读"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: voice_module_css_default.incomingList,
					children: props.waiting.map((entry) => {
						const checked = props.selection.includes(entry.id);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: voice_module_css_default.incomingRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.incomingLabel,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "checkbox",
										"aria-checked": checked,
										"aria-label": `选中「${entry.sessionTitle ?? entry.request.slice(0, 40)}」`,
										className: `${voice_module_css_default.rowCheck} ${checked ? voice_module_css_default.rowCheckOn : ""}`,
										onClick: () => props.onToggle(entry.id),
										children: checked ? "✓" : ""
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: voice_module_css_default.incomingTitle,
										children: entry.sessionTitle ?? entry.request.slice(0, 40)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.incomingMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: voice_module_css_default.incomingStatus,
										"data-status": entry.status,
										children: props.snoozed.includes(entry.id) ? "已稍后" : inboxStatusText(entry.status)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.sessionTitle === void 0 ? entry.request.slice(0, 60) : entry.request.slice(0, 40) })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.incomingActions,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: voice_module_css_default.incomingTime,
											children: [
												inboxAgeText(entry.createdAt),
												" · ",
												inboxDurationText(entry.durationMs)
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: voice_module_css_default.rowAnswer,
											onClick: () => props.onAnswerOne(entry.id),
											children: entry.requiresOriginalSession ? "原任务待答" : entry.kind === "needs-input" ? "回答" : "接听"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: voice_module_css_default.rowAction,
											onClick: () => setConfirmIds([entry.id]),
											children: "已读"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: voice_module_css_default.rowAction,
											onClick: () => props.onSnooze(entry.id),
											children: "稍后"
										})
									]
								})
							]
						}, entry.id);
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
					className: voice_module_css_default.incomingFooter,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							onClick: props.onSelectAll,
							children: allSelected ? "全不选" : "全选"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							onClick: () => setConfirmIds(props.waiting.map((entry) => entry.id)),
							children: "全部已读"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.answerButton,
							disabled: props.waiting.length === 0,
							onClick: props.onAnswer,
							children: props.selection.length > 1 ? `接听并汇报 ${props.selection.length} 条` : "接听"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: voice_module_css_default.incomingHint,
							children: "点「稍后」只是收起当前选择，任务会留在列表里。响铃时长可在插件设置里调整。"
						})
					]
				})
			] });
		}
		function inboxStatusText(status) {
			if (status === "completed") return "已完成";
			if (status === "cancelled") return "已取消";
			if (status === "needs-input") return "等待你回答";
			return "失败";
		}
		function inboxAgeText(createdAt) {
			const seconds = Math.max(0, Math.round((Date.now() - createdAt) / 1e3));
			if (seconds < 60) return `${seconds} 秒前`;
			const minutes = Math.round(seconds / 60);
			if (minutes < 60) return `${minutes} 分钟前`;
			return `${Math.round(minutes / 60)} 小时前`;
		}
		function inboxDurationText(durationMs) {
			const seconds = Math.round(durationMs / 1e3);
			if (seconds < 60) return `耗时 ${seconds} 秒`;
			return `耗时 ${Math.round(seconds / 60)} 分钟`;
		}
		/** How many listed entries are blocked on the user rather than reporting a result. */
		function pendingCount(entries) {
			return entries.filter((entry) => entry.kind === "needs-input").length;
		}
		//#endregion
		//#region src/client/ringtone.ts
		/**
		* Short synthesized ring for an incoming voice report.
		*
		* Synthesizing avoids shipping and decoding an audio asset, and keeps the
		* payload free of any third-party sample. Browsers require a user gesture
		* before audio may start, so a blocked context is a normal, silent outcome:
		* the list is still visible and the user can take the call manually.
		*/
		/** Default ring length; the Host setting overrides it. Zero never rings. */
		const RINGTONE_DURATION_MS = 5e3;
		/** One ring cycle: two short beeps, then a pause before the pattern repeats. */
		const BEEP_OFFSETS_IN_CYCLE_MS = [0, 250];
		const CYCLE_MS = 1200;
		const BEEP_DURATION_SECONDS = .18;
		const BEEP_FREQUENCY_HZ = 660;
		const BEEP_PEAK_GAIN = .12;
		/**
		* Start a ring of the requested length.
		*
		* @returns a stop function, or undefined when the browser cannot play audio
		*   or the configured duration is zero.
		*/
		function playRingtone(durationMs = RINGTONE_DURATION_MS) {
			if (!Number.isFinite(durationMs) || durationMs <= 0) return void 0;
			const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (Ctor === void 0) return void 0;
			let context;
			try {
				context = new Ctor();
			} catch {
				return;
			}
			const oscillators = [];
			for (let cycleStart = 0; cycleStart < durationMs; cycleStart += CYCLE_MS) for (const offsetInCycle of BEEP_OFFSETS_IN_CYCLE_MS) {
				const offset = cycleStart + offsetInCycle;
				if (offset >= durationMs) continue;
				startBeep(context, offset, oscillators);
			}
			if (oscillators.length === 0) return void 0;
			context.resume?.().catch(() => {});
			return () => {
				for (const oscillator of oscillators) try {
					oscillator.stop();
				} catch {}
				try {
					context.close?.();
				} catch {}
			};
		}
		function startBeep(context, offsetMs, oscillators) {
			try {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				const start = context.currentTime + offsetMs / 1e3;
				const end = start + BEEP_DURATION_SECONDS;
				oscillator.type = "sine";
				oscillator.frequency.value = BEEP_FREQUENCY_HZ;
				gain.gain.setValueAtTime(1e-4, start);
				gain.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, start + .02);
				gain.gain.linearRampToValueAtTime(1e-4, end);
				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(start);
				oscillator.stop(end);
				oscillators.push(oscillator);
			} catch {}
		}
		function defaultFloatingPosition(viewport, panel) {
			return clampFloatingPosition({
				x: viewport.width - panel.width - 12,
				y: Math.max(72, viewport.height - panel.height - 12)
			}, viewport, panel);
		}
		function clampFloatingPosition(position, viewport, panel) {
			const maxX = Math.max(12, viewport.width - panel.width - 12);
			const maxY = Math.max(12, viewport.height - panel.height - 12);
			return {
				x: Math.min(maxX, Math.max(12, position.x)),
				y: Math.min(maxY, Math.max(12, position.y))
			};
		}
		function moveFloatingPosition(origin, pointerStart, pointerNow, viewport, panel) {
			return clampFloatingPosition({
				x: origin.x + pointerNow.x - pointerStart.x,
				y: origin.y + pointerNow.y - pointerStart.y
			}, viewport, panel);
		}
		//#endregion
		//#region src/client/VoiceOverlay.tsx
		/**
		* The floating panel is a drag surface, so anything focusable or scrollable
		* inside it must be excluded from the drag gesture. Exempting only `button`
		* left checkboxes, links and selects dead: the drag handler cancels their
		* default behavior and captures the pointer before they can react.
		*/
		const INTERACTIVE_SELECTOR = "button, input, textarea, select, a[href], [role=\"button\"], [role=\"checkbox\"]";
		/** Root-level movable call surface that remains visible while the user changes DSH sessions. */
		function VoiceOverlay({ useVoice, useVoiceModelSettings, useSessions, end, toggleMute, cancelResponse, answerApproval, answerQuestion, answerInbox, answerInboxOne, snoozeInbox, toggleInboxSelection, selectAllInbox, clearInboxSelection, dismissInbox, openSession }) {
			const voice = useVoice((snapshot) => snapshot);
			const ringDurationMs = useVoiceModelSettings((snapshot) => snapshot.ringDurationMs);
			const [collapsed, setCollapsed] = (0, react.useState)(false);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [position, setPosition] = (0, react.useState)();
			const panelRef = (0, react.useRef)(null);
			const dragRef = (0, react.useRef)();
			const movedRef = (0, react.useRef)(false);
			const [questionAnswers, setQuestionAnswers] = (0, react.useState)({});
			const boundSession = useSessions((state) => voice.sessionId === void 0 ? void 0 : state.byId[voice.sessionId]);
			const currentSessionId = useSessions((state) => state.current);
			const viewingOtherSession = voice.sessionId !== void 0 && currentSessionId !== voice.sessionId;
			const waiting = (voice.inbox ?? []).filter((entry) => !entry.delivered);
			const snoozed = voice.snoozedInbox ?? [];
			const rungRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const ringRef = (0, react.useRef)();
			const stopRing = (0, react.useCallback)(() => {
				const ringing = ringRef.current;
				if (ringing === void 0) return;
				ringRef.current = void 0;
				clearTimeout(ringing.timer);
				ringing.stop();
			}, []);
			const waitingKey = waiting.map((entry) => entry.id).join(",");
			const snoozedKey = snoozed.join(",");
			(0, react.useEffect)(() => {
				if (voice.phase !== "idle") {
					stopRing();
					return;
				}
				const fresh = waiting.filter((entry) => !rungRef.current.has(entry.id) && !snoozed.includes(entry.id));
				if (fresh.length === 0) return;
				for (const entry of fresh) rungRef.current.add(entry.id);
				if (ringRef.current !== void 0) return;
				const stop = playRingtone(ringDurationMs);
				if (stop === void 0) return;
				const timer = setTimeout(() => {
					ringRef.current = void 0;
					stop();
				}, ringDurationMs);
				ringRef.current = {
					stop,
					timer
				};
			}, [
				waitingKey,
				snoozedKey,
				voice.phase,
				ringDurationMs,
				stopRing
			]);
			(0, react.useEffect)(() => stopRing, [stopRing]);
			(0, react.useEffect)(() => {
				if (snoozedKey !== "") stopRing();
			}, [snoozedKey, stopRing]);
			(0, react.useEffect)(() => {
				if (voice.phase === "requesting-permission") setCollapsed(false);
			}, [voice.phase]);
			(0, react.useEffect)(() => {
				setQuestionAnswers({});
			}, [voice.pendingQuestion?.requestId]);
			(0, react.useEffect)(() => {
				const panel = panelRef.current;
				if (panel === null || voice.phase === "idle") return;
				let frame = 0;
				const fit = () => {
					cancelAnimationFrame(frame);
					frame = requestAnimationFrame(() => {
						const rect = panel.getBoundingClientRect();
						const viewport = {
							width: window.innerWidth,
							height: window.innerHeight
						};
						const size = {
							width: rect.width,
							height: rect.height
						};
						setPosition((current) => current === void 0 ? defaultFloatingPosition(viewport, size) : clampFloatingPosition(current, viewport, size));
					});
				};
				fit();
				window.addEventListener("resize", fit);
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(fit);
				observer?.observe(panel);
				return () => {
					cancelAnimationFrame(frame);
					window.removeEventListener("resize", fit);
					observer?.disconnect();
				};
			}, [collapsed, voice.phase]);
			const beginDrag = (event, allowFromControl = false) => {
				if (event.button !== 0 || panelRef.current === null) return;
				if (!allowFromControl && event.target.closest(INTERACTIVE_SELECTOR) !== null) return;
				const rect = panelRef.current.getBoundingClientRect();
				dragRef.current = {
					pointerId: event.pointerId,
					pointerStart: {
						x: event.clientX,
						y: event.clientY
					},
					origin: {
						x: rect.left,
						y: rect.top
					}
				};
				movedRef.current = false;
				setDragging(true);
				event.currentTarget.setPointerCapture(event.pointerId);
				event.preventDefault();
			};
			const moveDrag = (event) => {
				const drag = dragRef.current;
				const panel = panelRef.current;
				if (drag === void 0 || drag.pointerId !== event.pointerId || panel === null) return;
				if (Math.abs(event.clientX - drag.pointerStart.x) + Math.abs(event.clientY - drag.pointerStart.y) > 4) movedRef.current = true;
				const rect = panel.getBoundingClientRect();
				setPosition(moveFloatingPosition(drag.origin, drag.pointerStart, {
					x: event.clientX,
					y: event.clientY
				}, {
					width: window.innerWidth,
					height: window.innerHeight
				}, {
					width: rect.width,
					height: rect.height
				}));
			};
			const endDrag = (event) => {
				if (dragRef.current?.pointerId !== event.pointerId) return;
				dragRef.current = void 0;
				setDragging(false);
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
			};
			if (voice.phase === "idle" && waiting.length === 0) return null;
			const floatingStyle = position === void 0 ? void 0 : {
				left: position.x,
				top: position.y,
				right: "auto",
				bottom: "auto"
			};
			if (voice.phase === "idle") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: panelRef,
				className: `${voice_module_css_default.overlay} ${voice_module_css_default.overlayIncoming} ${dragging ? voice_module_css_default.dragging : ""}`,
				style: floatingStyle,
				"aria-label": "待接听的语音汇报",
				onPointerDown: beginDrag,
				onPointerMove: moveDrag,
				onPointerUp: endDrag,
				onPointerCancel: endDrag,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallBackList, {
					waiting,
					snoozed,
					selection: voice.inboxSelection,
					onToggle: toggleInboxSelection,
					onSelectAll: selectAllInbox,
					onClearSelection: clearInboxSelection,
					onDismiss: dismissInbox,
					onAnswer: () => answerInbox(),
					onAnswerOne: answerInboxOne,
					onSnooze: snoozeInbox
				}), voice.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					className: voice_module_css_default.inlineError,
					children: voice.error
				})]
			});
			if (collapsed && voice.phase !== "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				ref: panelRef,
				className: `${voice_module_css_default.voiceOrb} ${dragging ? voice_module_css_default.dragging : ""}`,
				style: floatingStyle,
				"data-phase": voice.phase,
				"aria-label": `实时语音：${phaseText(voice.phase)}`,
				onPointerDown: (event) => beginDrag(event, true),
				onPointerMove: moveDrag,
				onPointerUp: endDrag,
				onPointerCancel: endDrag,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: voice_module_css_default.orbButton,
					"aria-label": "展开实时语音",
					title: "拖动悬浮球；点击展开",
					onClick: () => {
						if (movedRef.current) {
							movedRef.current = false;
							return;
						}
						setCollapsed(false);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: voice_module_css_default.orbWaves,
						"aria-hidden": true,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.orbTime,
						children: formatElapsed(voice.elapsedSeconds)
					})]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: panelRef,
				className: `${voice_module_css_default.overlay} ${voice.phase === "error" ? voice_module_css_default.overlayError : ""} ${dragging ? voice_module_css_default.dragging : ""}`,
				style: floatingStyle,
				"aria-label": "实时语音通话",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: `${voice_module_css_default.overlayHeader} ${voice_module_css_default.dragHandle}`,
					title: "拖动语音窗口",
					onPointerDown: beginDrag,
					onPointerMove: moveDrag,
					onPointerUp: endDrag,
					onPointerCancel: endDrag,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: voice_module_css_default.eyebrow,
						children: "DSH 实时语音"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.phaseLine,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: voice_module_css_default.liveDot }),
							phaseText(voice.phase),
							" · ",
							formatElapsed(voice.elapsedSeconds)
						]
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.headerActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: voice_module_css_default.agentState,
							children: voice.agentRunning ? "Agent 工作中" : "Agent 待命"
						}), voice.phase === "error" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.iconButton,
							"aria-label": "收起为悬浮球",
							title: "收起为悬浮球",
							onClick: () => setCollapsed(true),
							children: "−"
						})]
					})]
				}), voice.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: voice_module_css_default.errorText,
					children: voice.error
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: voice_module_css_default.secondaryButton,
					onClick: () => void end(),
					children: "关闭"
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.bindingCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: voice_module_css_default.bindingLabel,
								children: "本次通话一对一绑定"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: voice_module_css_default.bindingTitle,
								children: boundSession?.displayTitle ?? "当前 DSH 会话"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: voice_module_css_default.bindingMeta,
								children: [
									boundSession?.blank === true ? "空白新会话 · 首个 Agent 指令会写入第一轮" : "工作指令与 Agent 结果保存在此线程",
									" · ",
									realtimeVoiceModelLabel(voice.providerModel),
									" · ",
									realtimeVoiceTurnDetectionLabel(voice.turnDetection)
								]
							}),
							viewingOtherSession ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: voice_module_css_default.returnLink,
								onClick: () => openSession(voice.sessionId),
								children: "当前正在查看其他线程，返回绑定线程"
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.transcripts,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.transcriptBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: voice_module_css_default.speakerLabel,
								children: "你"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: voice_module_css_default.userText,
								children: voice.userTranscript || "正在聆听…"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.transcriptBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: voice_module_css_default.speakerLabel,
								children: "语音 Agent"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: voice_module_css_default.assistantText,
								children: voice.assistantTranscript || "你可以直接交代任务、追问进度或随时纠正方向。"
							})]
						})]
					}),
					voice.agentSummary === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.agentSummary,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "DSH Agent 最新结果" }), voice.agentSummary]
					}),
					voice.pendingApproval === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: voice_module_css_default.interactionCard,
						"aria-label": "DSH 操作审批",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "需要你的批准" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: voice_module_css_default.interactionTitle,
								children: voice.pendingApproval.toolName
							}),
							voice.pendingApproval.reason === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: voice_module_css_default.interactionDetail,
								children: voice.pendingApproval.reason
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: voice_module_css_default.interactionActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: voice_module_css_default.rejectButton,
									onClick: () => answerApproval(voice.pendingApproval.approvalId, "rejected"),
									children: "拒绝"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: voice_module_css_default.allowButton,
									onClick: () => answerApproval(voice.pendingApproval.approvalId, "allowed-once"),
									children: "仅允许这一次"
								})]
							})
						]
					}),
					voice.pendingQuestion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: voice_module_css_default.interactionCard,
						"aria-label": "DSH Agent 追问",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Agent 需要你确认" }),
							voice.pendingQuestion.questions.map((question) => {
								const current = questionAnswers[question.id] ?? {
									selected: [],
									custom: ""
								};
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.questionBlock,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: voice_module_css_default.interactionTitle,
											children: question.header ?? question.question
										}),
										question.header === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: voice_module_css_default.interactionDetail,
											children: question.question
										}),
										question.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: voice_module_css_default.interactionDetail,
											children: question.detail
										}),
										question.options?.map((option) => {
											const checked = current.selected.includes(option.label);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: voice_module_css_default.questionOption,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: question.multiSelect === true ? "checkbox" : "radio",
													name: `${voice.pendingQuestion.requestId}:${question.id}`,
													checked,
													onChange: () => setQuestionAnswers((previous) => ({
														...previous,
														[question.id]: {
															...current,
															selected: question.multiSelect === true ? checked ? current.selected.filter((value) => value !== option.label) : [...current.selected, option.label] : [option.label]
														}
													}))
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [option.label, option.description === void 0 ? "" : ` — ${option.description}`] })]
											}, option.label);
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: voice_module_css_default.questionCustom,
											value: current.custom,
											placeholder: question.options === void 0 ? "输入回答" : "其他补充（可选）",
											onChange: (event) => setQuestionAnswers((previous) => ({
												...previous,
												[question.id]: {
													...current,
													custom: event.target.value
												}
											}))
										})
									]
								}, question.id);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: voice_module_css_default.interactionActions,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: voice_module_css_default.allowButton,
									onClick: () => {
										const answers = voice.pendingQuestion.questions.map((question) => {
											const answer = questionAnswers[question.id] ?? {
												selected: [],
												custom: ""
											};
											return {
												id: question.id,
												selected: answer.selected,
												...answer.custom.trim() === "" ? {} : { custom: answer.custom.trim() }
											};
										}).filter((answer) => answer.selected.length > 0 || answer.custom !== void 0);
										answerQuestion(voice.pendingQuestion.requestId, answers);
									},
									children: "提交回答"
								})
							})
						]
					}),
					voice.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: voice_module_css_default.inlineError,
						children: voice.error
					}),
					waiting.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.incomingNotice,
						children: [
							"还有 ",
							waiting.length,
							" 个后台任务已完成，结束后可接听汇报。"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: voice_module_css_default.controls,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: voice_module_css_default.secondaryButton,
								onClick: toggleMute,
								children: voice.muted ? "取消静音" : "静音"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: voice_module_css_default.secondaryButton,
								onClick: cancelResponse,
								children: "立即打断"
							}),
							voice.sessionId === void 0 || !viewingOtherSession ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: voice_module_css_default.secondaryButton,
								onClick: () => openSession(voice.sessionId),
								children: "返回任务"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: voice_module_css_default.endButton,
								onClick: () => void end(),
								children: "结束"
							})
						]
					})
				] })]
			});
		}
		function phaseText(phase) {
			switch (phase) {
				case "requesting-permission": return "请求麦克风";
				case "connecting": return "正在接通";
				case "listening": return "正在聆听";
				case "thinking": return "正在思考";
				case "agent-working": return "正在操作 DSH";
				case "speaking": return "正在回答";
				case "reconnecting": return "正在重连";
				case "ending": return "正在结束";
				case "idle": return "待机";
				case "error": return "出错";
			}
		}
		function formatElapsed(seconds) {
			return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
		}
		//#endregion
		//#region src/client/VoiceLauncher.tsx
		/** How long the ball must be held before the butler panel opens. */
		const LONG_PRESS_MS = 500;
		/**
		* Always mounted: no current conversation is needed to place a call.
		*
		* The resting state is a single dial ball — one click connects to the default
		* butler. Choosing or creating a butler lives behind a long press or a right
		* click, so the everyday gesture stays "call someone who knows me".
		*/
		function VoiceLauncher({ useVoice, startSupervisor, startButler, selectTask, createTask, createButler, butlers }) {
			const voice = useVoice((value) => value);
			const [open, setOpen] = (0, react.useState)(false);
			const [directory, setDirectory] = (0, react.useState)();
			const [error, setError] = (0, react.useState)("");
			const [workspace, setWorkspace] = (0, react.useState)("");
			const [preset, setPreset] = (0, react.useState)("");
			const [query, setQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [pendingTask, setPendingTask] = (0, react.useState)("");
			const [butlerName, setButlerName] = (0, react.useState)("");
			const pressTimer = (0, react.useRef)(void 0);
			const longPressed = (0, react.useRef)(false);
			const connected = voice.supervisor && [
				"listening",
				"thinking",
				"speaking",
				"agent-working"
			].includes(voice.phase);
			(0, react.useEffect)(() => {
				if (!open) return;
				const abort = new AbortController();
				fetch(VOICE_DIRECTORY_ROUTE, {
					cache: "no-store",
					signal: abort.signal
				}).then(async (response) => {
					if (!response.ok) throw new Error("目录暂不可用，请关闭菜单后重试");
					setDirectory(await response.json());
				}).catch((err) => {
					if (!abort.signal.aborted) setError(String(err));
				});
				return () => abort.abort();
			}, [open, voice.sessionId]);
			(0, react.useEffect)(() => {
				if (voice.sessionId === pendingTask || voice.error) setPendingTask("");
			}, [
				voice.sessionId,
				voice.error,
				pendingTask
			]);
			(0, react.useEffect)(() => () => clearTimeout(pressTimer.current), []);
			async function run(action) {
				if (busy) return;
				setBusy(true);
				setError("");
				try {
					await action();
				} catch (err) {
					setError(String(err));
				} finally {
					setBusy(false);
				}
			}
			function beginPress() {
				longPressed.current = false;
				clearTimeout(pressTimer.current);
				pressTimer.current = setTimeout(() => {
					longPressed.current = true;
					setOpen(true);
				}, LONG_PRESS_MS);
			}
			function endPress() {
				clearTimeout(pressTimer.current);
			}
			function click() {
				if (longPressed.current) {
					longPressed.current = false;
					return;
				}
				if (voice.phase !== "idle" && voice.phase !== "error") return;
				run(startSupervisor);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: voice_module_css_default.launcher,
				"aria-label": "语音总管",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${voice_module_css_default.dialBall} ${connected ? voice_module_css_default.dialBallActive : ""}`,
					"aria-label": "打给语音总管",
					title: "单击打给语音总管；长按或右键选择/新建总管",
					"aria-expanded": open,
					onPointerDown: beginPress,
					onPointerUp: endPress,
					onPointerCancel: endPress,
					onContextMenu: (event) => {
						event.preventDefault();
						setOpen(true);
					},
					onClick: click,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.dialBallGlyph,
						"aria-hidden": "true"
					})
				}), !open ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: voice_module_css_default.launcherMenu,
					"aria-label": "选择或新建语音总管",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "语音总管" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "单击圆球直接打给默认总管；这里可以选择已有的某一位，或新安排一位。" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.launcherTasks,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy || voice.phase !== "idle" && voice.phase !== "error",
									"aria-pressed": voice.supervisor === true && butlers.every((row) => row.id !== voice.butlerId),
									onClick: () => void run(startSupervisor),
									children: "默认总管"
								}),
								butlers.map((butler) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy || !startButler || voice.phase !== "idle" && voice.phase !== "error",
									"aria-pressed": voice.supervisor === true && voice.butlerId === butler.id,
									onClick: () => void run(async () => {
										await startButler?.(butler.id);
									}),
									children: butler.name
								}, butler.id)),
								butlers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "还没有总管，先新安排一位。" }) : null
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["新总管称呼", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: butlerName,
							"aria-label": "新总管称呼",
							onChange: (event) => setButlerName(event.target.value),
							placeholder: "例如：运维"
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							disabled: busy || !butlerName.trim(),
							onClick: () => void run(async () => {
								const id = await createButler(butlerName.trim());
								setButlerName("");
								await startButler?.(id);
							}),
							children: "新安排一位总管"
						}),
						error || voice.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							children: error || voice.error
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["查找已有任务", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: query,
							onChange: (event) => setQuery(event.target.value),
							placeholder: "名称或项目目录"
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.launcherTasks,
							children: [directory?.tasks.filter((task) => `${task.title} ${task.cwd ?? ""}`.includes(query)).map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !connected || busy || !!pendingTask,
								"aria-pressed": voice.sessionId === task.taskId,
								onClick: () => void run(async () => {
									setPendingTask(task.taskId);
									await selectTask(task.taskId);
								}),
								children: [task.running ? "执行中 · " : "", task.title]
							}, task.taskId)), directory?.tasks.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "暂无已有任务，可选择项目和 Agent 创建。" }) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["项目", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: workspace,
							onChange: (event) => setWorkspace(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: "选择项目"
							}), directory?.projects.map((project) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: project.id,
								children: [
									project.title,
									" · ",
									project.path
								]
							}, project.id))]
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["Agent", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: preset,
							onChange: (event) => setPreset(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: "选择 Agent"
							}), directory?.agents.filter((agent) => !agent.broken).map((agent) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: agent.id,
								children: agent.name ?? agent.id
							}, agent.id))]
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: voice_module_css_default.secondaryButton,
							disabled: !connected || busy || !workspace || !preset,
							onClick: () => void run(() => createTask(workspace, preset)),
							children: "新建并选择任务"
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/VoiceSettingsCard.tsx
		/** One native Plugins-settings card. Changes persist immediately and affect the next call. */
		function VoiceSettingsCard({ useVoiceModelSettings, selectModel, selectTurnDetection, selectVoice, setVadThreshold, setSilenceDuration, setMaxHistoryTurns, setSpeechEmotion, setStylePrompt, selectProgressReporting, setProgressMinInterval, setProgressQuietTask, setHandoffSkill, setHandoffInstructions, setSupervisorSkill, setSupervisorInstructions, setRingDuration, saveApiKey }) {
			const state = useVoiceModelSettings((snapshot) => snapshot);
			const [apiKey, setApiKey] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)({ phase: "idle" });
			const previewAudio = (0, react.useRef)(void 0);
			const previewUrl = (0, react.useRef)(void 0);
			const previewAbort = (0, react.useRef)(void 0);
			const stopPreview = () => {
				previewAbort.current?.abort();
				previewAbort.current = void 0;
				previewAudio.current?.pause();
				previewAudio.current = void 0;
				if (previewUrl.current !== void 0) URL.revokeObjectURL(previewUrl.current);
				previewUrl.current = void 0;
				setPreview({ phase: "idle" });
			};
			(0, react.useEffect)(() => () => {
				previewAbort.current?.abort();
				previewAudio.current?.pause();
				if (previewUrl.current !== void 0) URL.revokeObjectURL(previewUrl.current);
			}, []);
			const togglePreview = async () => {
				if (preview.phase !== "idle") {
					stopPreview();
					return;
				}
				const abort = new AbortController();
				previewAbort.current = abort;
				setPreview({ phase: "loading" });
				try {
					const response = await fetch(VOICE_PREVIEW_ROUTE, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							model: state.model,
							voice: state.voice
						}),
						signal: abort.signal
					});
					if (!response.ok) {
						const body = await response.json().catch(() => ({}));
						const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "音色试听失败，请稍后重试。";
						throw new Error(message);
					}
					const url = URL.createObjectURL(await response.blob());
					previewUrl.current = url;
					const audio = new Audio(url);
					previewAudio.current = audio;
					audio.onended = stopPreview;
					audio.onerror = () => {
						stopPreview();
						setPreview({
							phase: "idle",
							error: "试听音频无法播放。"
						});
					};
					await audio.play();
					previewAbort.current = void 0;
					setPreview({ phase: "playing" });
				} catch (error) {
					if (abort.signal.aborted) return;
					stopPreview();
					setPreview({
						phase: "idle",
						error: error instanceof Error ? error.message : String(error)
					});
				}
			};
			if (!state.available) return null;
			const disabled = !state.writable || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: voice_module_css_default.settingsCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: voice_module_css_default.settingsCardHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.settingsCardIcon,
						"aria-hidden": true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WaveGlyph, {})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: voice_module_css_default.settingsCardHeading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "DSH 实时语音" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "选择语音理解、全双工通话和工具调度使用的百炼模型。" })]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: voice_module_css_default.settingsCardBody,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: voice_module_css_default.settingsLabel,
							children: "实时语音模型"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.modelSwitch,
							role: "radiogroup",
							"aria-label": "实时语音模型",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
								title: "Flash",
								detail: "经济 · 低延迟 · 推荐日常使用",
								selected: state.model === REALTIME_VOICE_MODELS.flash,
								disabled,
								onClick: () => selectModel(REALTIME_VOICE_MODELS.flash)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
								title: "Plus",
								detail: "高质量 · 成本更高",
								selected: state.model === REALTIME_VOICE_MODELS.plus,
								disabled,
								onClick: () => selectModel(REALTIME_VOICE_MODELS.plus)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: voice_module_css_default.settingsHint,
							children: state.saving ? "正在保存…" : "设置即时保存，从下一通电话开始生效；不会中断正在进行的通话。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "VAD 打断方式"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.modelSwitchThree,
									role: "radiogroup",
									"aria-label": "VAD 打断方式",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "快速打断",
											detail: "纯声学 VAD · 最快",
											selected: state.turnDetection === REALTIME_VOICE_TURN_DETECTION.fast,
											disabled,
											onClick: () => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.fast)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "智能轮次",
											detail: "声学＋语义 · 过滤附和",
											selected: state.turnDetection === REALTIME_VOICE_TURN_DETECTION.semantic,
											disabled,
											onClick: () => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.semantic)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "智能轮次 v2",
											detail: "新版语义判轮 · 推荐",
											selected: state.turnDetection === REALTIME_VOICE_TURN_DETECTION.semanticV2,
											disabled,
											onClick: () => selectTurnDetection(REALTIME_VOICE_TURN_DETECTION.semanticV2)
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "智能轮次会忽略“嗯、啊”等无意义声音，不触发对话轮；v2 是新版判轮策略。 快速打断会在检测到你开口后立即清空本地播报，并取消云端旧响应。"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "音色与通话参数"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: voice_module_css_default.selectField,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: voice_module_css_default.numberFieldLabel,
										children: "播报音色"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: voice_module_css_default.voicePreviewRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											className: voice_module_css_default.selectInput,
											value: state.voice,
											disabled,
											onChange: (event) => {
												if (preview.phase !== "idle") stopPreview();
												selectVoice(event.target.value);
											},
											children: REALTIME_VOICE_VOICES.map((voice) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: voice,
												children: realtimeVoiceVoiceLabel(voice)
											}, voice))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: voice_module_css_default.previewButton,
											"aria-label": "试听当前音色",
											disabled: !state.apiKeyConfigured,
											onClick: () => {
												togglePreview();
											},
											children: preview.phase === "loading" ? "生成中…" : preview.phase === "playing" ? "停止" : "试听"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "音色只能在建立连接时设置一次；已进行的通话不受影响。试听使用固定短句，不会创建 DSH 任务。"
								}),
								preview.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsError,
									role: "alert",
									children: preview.error
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.numberRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "VAD 灵敏度（-1 ~ 1）",
										suffix: "",
										step: .05,
										toDisplay: (value) => String(value),
										toValue: (value) => Math.round(value * 100) / 100,
										value: state.vadThreshold,
										disabled: disabled || state.turnDetection !== REALTIME_VOICE_TURN_DETECTION.fast,
										commit: (value) => setVadThreshold(value)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "静音判停",
										suffix: "毫秒",
										step: 50,
										toDisplay: (value) => String(value),
										toValue: (value) => Math.round(value),
										value: state.silenceDurationMs,
										disabled: disabled || state.turnDetection !== REALTIME_VOICE_TURN_DETECTION.fast,
										commit: (value) => setSilenceDuration(value)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "VAD 灵敏度与静音判停只在“快速打断”模式下生效，建议静音判停 400–800 毫秒。"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.numberRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "上下文历史轮数（1 ~ 50）",
										suffix: "轮",
										step: 1,
										toDisplay: (value) => String(value),
										toValue: (value) => Math.round(value),
										value: state.maxHistoryTurns,
										disabled,
										commit: (value) => setMaxHistoryTurns(value)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: voice_module_css_default.numberField,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: voice_module_css_default.numberFieldLabel,
											children: "情绪增强"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: voice_module_css_default.toggleRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												role: "switch",
												"aria-checked": state.enableSpeechEmotion,
												className: `${voice_module_css_default.toggle} ${state.enableSpeechEmotion ? voice_module_css_default.toggleOn : ""}`,
												disabled,
												onClick: () => setSpeechEmotion(!state.enableSpeechEmotion),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: voice_module_css_default.toggleKnob,
													"aria-hidden": true
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: voice_module_css_default.toggleCaption,
												children: state.enableSpeechEmotion ? "开启" : "关闭"
											})]
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StylePromptField, {
									value: state.stylePrompt,
									disabled,
									commit: (value) => setStylePrompt(value)
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "进度播报"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.modelSwitchThree,
									role: "radiogroup",
									"aria-label": "进度播报粒度",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "仅关键节点",
											detail: "长任务每 45 秒最多一句 · 推荐",
											selected: state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.keyOnly,
											disabled,
											onClick: () => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.keyOnly)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "不播报进度",
											detail: "只在需要你决定或完成时开口",
											selected: state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent,
											disabled,
											onClick: () => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.silent)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelChoice, {
											title: "全部播报",
											detail: "每个执行阶段都同步一句",
											selected: state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.all,
											disabled,
											onClick: () => selectProgressReporting(REALTIME_VOICE_PROGRESS_REPORTING.all)
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "只影响执行过程中的阶段话术。审批、提问、失败和最终结果始终会播报。"
								}),
								state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.all ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.numberRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "最小播报间隔",
										suffix: "秒",
										value: state.progressMinIntervalMs,
										disabled: disabled || state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent,
										commit: (value) => setProgressMinInterval(value)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "短任务静默阈值",
										suffix: "秒",
										value: state.progressQuietTaskMs,
										disabled: disabled || state.progressReporting === REALTIME_VOICE_PROGRESS_REPORTING.silent,
										commit: (value) => setProgressQuietTask(value)
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "执行 Agent 汇报指导"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillNameField, {
									value: state.handoffSkill,
									disabled,
									commit: (value) => setHandoffSkill(value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: voice_module_css_default.settingsHint,
									children: [
										"可留空。填 DSH Skill 名（如 ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "dsh-voice-supervisor" }),
										"），或填一个 markdown 文件的绝对路径 （如 ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "~/my-skill/SKILL.md" }),
										"，支持 ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "~" }),
										"）。每次把任务交给执行 Agent 时， 这段正文会随任务一起下发，用来规定它怎么汇报进展、先看什么、怎么安排工作。 插件内置了 ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "dsh-voice-supervisor" }),
										" 范本，但默认不启用；想用就填它的名字。"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HandoffInstructionsField, {
									value: state.handoffInstructions,
									disabled,
									commit: (value) => setHandoffInstructions(value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "临时补充的汇报要求，追加在 Skill 正文之后，适合这次不想改 Skill 的微调。 它只影响汇报与规划，不覆盖你的指令、会话权限或工具结果。"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "语音总管沟通指导"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillNameField, {
									value: state.supervisorSkill,
									disabled,
									commit: setSupervisorSkill
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "可留空使用默认规则。支持已选项目中的 Skill 名或 markdown 文件绝对路径。 用于指导语音模型如何确认对象、查询结果和安排工作，与执行 Agent 的指导分开。 加载失败会在通话中显示提示；切换项目会重新加载。"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HandoffInstructionsField, {
									value: state.supervisorInstructions,
									disabled,
									commit: setSupervisorInstructions
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.settingsSubsection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "回拨振铃"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.numberRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
										label: "响铃时长（0 表示不响）",
										suffix: "秒",
										value: state.ringDurationMs,
										disabled,
										commit: (value) => setRingDuration(value)
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "任务完成后的来电提示音时长，最多 60 秒。无论响铃多久，任务都会留在回拨列表里，随时可以再接听。"
								})
							]
						}),
						state.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: voice_module_css_default.settingsError,
							role: "alert",
							children: state.error
						}),
						state.writable ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: voice_module_css_default.settingsHint,
							children: "当前连接不能修改主机设置，请在本机 3080 WebUI 中操作。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: voice_module_css_default.credentialSection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: voice_module_css_default.settingsLabel,
									children: "阿里云百炼 API Key"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.credentialStatus,
									"data-configured": state.apiKeyConfigured || void 0,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: voice_module_css_default.credentialDot }), state.apiKeyConfigured ? `已自动检测到 ${state.apiKeyRef}（环境变量或 DSH 凭据）` : `未检测到 ${state.apiKeyRef}`]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.credentialInputRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "password",
										autoComplete: "off",
										spellCheck: false,
										className: voice_module_css_default.credentialInput,
										value: apiKey,
										placeholder: state.apiKeyConfigured ? "输入新 Key 可安全替换" : "sk-…",
										"aria-label": "阿里云百炼 API Key",
										disabled: !state.apiKeyWritable || state.apiKeySaving,
										onChange: (event) => setApiKey(event.target.value)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: voice_module_css_default.credentialSave,
										disabled: !state.apiKeyWritable || state.apiKeySaving || apiKey.trim() === "",
										onClick: () => {
											saveApiKey(apiKey).then((saved) => {
												if (saved) setApiKey("");
											});
										},
										children: state.apiKeySaving ? "保存中…" : "保存 Key"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "密钥通过 DSH 官方 credentials 写入，只能检查是否存在，浏览器无法回读明文。"
								}),
								state.apiKeyError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsError,
									role: "alert",
									children: state.apiKeyError
								})
							]
						})
					]
				})]
			});
		}
		function NumberField(props) {
			const [draft, setDraft] = (0, react.useState)(void 0);
			const display = props.toDisplay ?? ((value) => String(Math.round(value / 1e3)));
			const toValue = props.toValue ?? ((value) => Math.round(value * 1e3));
			const shown = draft ?? display(props.value);
			const commit = () => {
				const parsed = Number(shown);
				setDraft(void 0);
				if (!Number.isFinite(parsed)) return;
				props.commit(toValue(parsed));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: voice_module_css_default.numberField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: voice_module_css_default.numberFieldLabel,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: voice_module_css_default.numberFieldInput,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "number",
						step: props.step ?? 1,
						inputMode: "numeric",
						className: voice_module_css_default.numberInput,
						value: shown,
						disabled: props.disabled,
						onChange: (event) => setDraft(event.target.value),
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") commit();
						}
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.numberSuffix,
						children: props.suffix
					})]
				})]
			});
		}
		function StylePromptField(props) {
			const [draft, setDraft] = (0, react.useState)(void 0);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft === void 0) return;
				setDraft(void 0);
				if (draft.trim() !== props.value) props.commit(draft);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: voice_module_css_default.styleField,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.numberFieldLabel,
						children: "说话风格 / 人设（可留空）"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: voice_module_css_default.styleInput,
						rows: 3,
						maxLength: 2e3,
						spellCheck: false,
						placeholder: "例如：语速偏慢，称呼我为“老板”，每次回答不超过两句。",
						value: shown,
						disabled: props.disabled,
						onChange: (event) => setDraft(event.target.value),
						onBlur: commit
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.settingsHint,
						children: "只影响语气、称呼和长短，不会改变工具调用、审批与终态规则；从下一通电话开始生效。"
					})
				]
			});
		}
		function SkillNameField(props) {
			const [draft, setDraft] = (0, react.useState)(void 0);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft === void 0) return;
				setDraft(void 0);
				if (draft.trim() !== props.value) props.commit(draft);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: voice_module_css_default.numberField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: voice_module_css_default.numberFieldLabel,
					children: "汇报 Skill 名称或文件路径（可留空）"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: voice_module_css_default.numberFieldInput,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						className: voice_module_css_default.numberInput,
						spellCheck: false,
						autoComplete: "off",
						maxLength: 512,
						placeholder: "dsh-voice-supervisor 或 ~/my-skill/SKILL.md",
						value: shown,
						disabled: props.disabled,
						onChange: (event) => setDraft(event.target.value),
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") commit();
						}
					})
				})]
			});
		}
		function HandoffInstructionsField(props) {
			const [draft, setDraft] = (0, react.useState)(void 0);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft === void 0) return;
				setDraft(void 0);
				if (draft.trim() !== props.value) props.commit(draft);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: voice_module_css_default.styleField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: voice_module_css_default.numberFieldLabel,
					children: "补充汇报指令（可留空）"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					className: voice_module_css_default.styleInput,
					rows: 4,
					maxLength: 8e3,
					spellCheck: false,
					placeholder: "例如：先给我一句话结论；只汇报影响我决策的进展；改动的文件用中文列名字。",
					value: shown,
					disabled: props.disabled,
					onChange: (event) => setDraft(event.target.value),
					onBlur: commit
				})]
			});
		}
		function ModelChoice(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				role: "radio",
				"aria-checked": props.selected,
				className: `${voice_module_css_default.modelChoice} ${props.selected ? voice_module_css_default.modelChoiceSelected : ""}`,
				disabled: props.disabled,
				onClick: props.onClick,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.modelChoiceTitle,
						children: props.title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.modelChoiceDetail,
						children: props.detail
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: voice_module_css_default.radioDot,
						"aria-hidden": true
					})
				]
			});
		}
		function WaveGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 24 24",
				className: voice_module_css_default.icon,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 13v-2M8 16V8M12 19V5M16 16V8M20 13v-2" })
			});
		}
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"sessions",
			"remote",
			"remote.credentials",
			"settingsScope"
		];
		/** Register one composer action and one frame overlay; both disappear with this client fiber. */
		function apply(ctx) {
			const voice = new VoiceCallController();
			voice.startPresence();
			const modelSettings = new VoiceModelSettingsController(ctx.settingsScope.bind({
				namespace: REALTIME_VOICE_SETTINGS_NAMESPACE,
				decode: decodeVoiceModelSettings
			}), ctx);
			ctx.effect(() => async () => {
				modelSettings.dispose();
				await voice.dispose();
			}, "realtime-voice: browser media and settings lifecycle");
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", (ref) => {
				modelSettings.refreshCredential(ref);
			}), "realtime-voice: credential state invalidation");
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "realtime-voice",
				order: 20,
				inject: (sessionId) => ({
					hooks: { voice },
					toggle: () => {
						const phase = voice.getSnapshot().phase;
						if (phase === "idle" || phase === "error") voice.start(sessionId);
						else voice.end();
					}
				})
			}, VoiceButton));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "realtime-voice-launcher",
				order: 99,
				inject: () => ({
					hooks: { voice },
					startSupervisor: () => voice.startSupervisor(),
					startButler: (butlerId) => voice.startButler(butlerId),
					selectTask: (taskId) => voice.selectTask(taskId),
					createTask: (workspace, preset) => voice.createTask(workspace, preset),
					createButler: (name) => voice.createButler(name),
					butlers: voice.butlerRoster()
				})
			}, VoiceLauncher));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "realtime-voice",
				order: 100,
				inject: () => ({
					hooks: {
						voice,
						voiceModelSettings: modelSettings
					},
					end: () => voice.end(),
					toggleMute: () => voice.toggleMute(),
					cancelResponse: () => voice.cancelResponse(),
					answerInbox: (sessionId) => {
						voice.answerInbox(sessionId);
					},
					answerInboxOne: (entryId) => {
						voice.answerInboxOne(entryId);
					},
					snoozeInbox: (entryId) => voice.snoozeInbox(entryId),
					toggleInboxSelection: (entryId) => voice.toggleInboxSelection(entryId),
					selectAllInbox: () => voice.selectAllInbox(),
					clearInboxSelection: () => voice.clearInboxSelection(),
					dismissInbox: (entryIds) => voice.dismissInbox(entryIds),
					answerApproval: (approvalId, outcome) => voice.answerApproval(approvalId, outcome),
					answerQuestion: (requestId, answers) => voice.answerQuestion(requestId, answers),
					openSession: (sessionId) => {
						ctx.sessions.open(sessionId);
					}
				})
			}, VoiceOverlay));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: REALTIME_VOICE_SETTINGS_NAMESPACE,
				priority: 30,
				inject: () => ({
					hooks: { voiceModelSettings: modelSettings },
					selectModel: (model) => {
						modelSettings.select(model);
					},
					selectTurnDetection: (mode) => {
						modelSettings.selectTurnDetection(mode);
					},
					selectVoice: (voice) => {
						modelSettings.selectVoice(voice);
					},
					setVadThreshold: (value) => {
						modelSettings.setVadThreshold(value);
					},
					setSilenceDuration: (value) => {
						modelSettings.setSilenceDuration(value);
					},
					setMaxHistoryTurns: (value) => {
						modelSettings.setMaxHistoryTurns(value);
					},
					setSpeechEmotion: (value) => {
						modelSettings.setSpeechEmotion(value);
					},
					setStylePrompt: (value) => {
						modelSettings.setStylePrompt(value);
					},
					selectProgressReporting: (mode) => {
						modelSettings.setProgressReporting(mode);
					},
					setProgressMinInterval: (value) => {
						modelSettings.setProgressMinInterval(value);
					},
					setProgressQuietTask: (value) => {
						modelSettings.setProgressQuietTask(value);
					},
					setHandoffSkill: (value) => {
						modelSettings.setHandoffSkill(value);
					},
					setHandoffInstructions: (value) => {
						modelSettings.setHandoffInstructions(value);
					},
					setSupervisorSkill: (value) => {
						modelSettings.setSupervisorSkill(value);
					},
					setSupervisorInstructions: (value) => {
						modelSettings.setSupervisorInstructions(value);
					},
					setRingDuration: (value) => {
						modelSettings.setRingDuration(value);
					},
					saveApiKey: (value) => modelSettings.saveApiKey(value)
				})
			}, VoiceSettingsCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map