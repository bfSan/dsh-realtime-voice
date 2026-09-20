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
		/**
		* Name of the reporting/planning skill the plugin ships with. A project skill
		* under the same name outranks it, so an operator can shadow the default
		* without touching plugin internals. Shared by the Host default and the
		* settings card so both surfaces agree on one value.
		*/
		const DEFAULT_HANDOFF_SKILL_NAME = "dsh-voice-supervisor";
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
		const VOICE_WEB_CLIENT_VERSION = "0.1.0-alpha.16";
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
			inboxSelection: []
		};
		/** Root-lifetime call controller shared by the session button and frame overlay through inject hooks. */
		var VoiceCallController = class {
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
			* Ring back: take the call up against the selected task's own session and
			* ask the Host to speak those results in selection order.
			*/
			async answerInbox(sessionId) {
				const selected = this.snapshot.inboxSelection.length > 0 ? this.snapshot.inboxSelection : this.snapshot.inbox.filter((entry) => !entry.delivered).slice(0, 1).map((entry) => entry.id);
				if (selected.length === 0) return;
				const target = sessionId ?? this.snapshot.inbox.find((entry) => entry.id === selected[0])?.sessionId;
				if (target === void 0) return;
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
			}
			/** Keep the task in the list but stop offering it as a call to take. */
			dismissInbox(entryIds) {
				if (entryIds.length === 0) return;
				this.deleteInbox(entryIds);
				this.update({
					...this.snapshot,
					inbox: this.snapshot.inbox.filter((entry) => !entryIds.includes(entry.id)),
					inboxSelection: this.snapshot.inboxSelection.filter((id) => !entryIds.includes(id))
				});
			}
			async deleteInbox(entryIds) {
				try {
					const query = entryIds.map((id) => `id=${encodeURIComponent(id)}`).join("&");
					await fetch(`${VOICE_INBOX_ROUTE}?${query}`, { method: "DELETE" });
				} catch {}
			}
			async start(sessionId) {
				if (this.snapshot.phase !== "idle" && this.snapshot.phase !== "error") return;
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
					const audio = new BrowserAudioEngine((pcm) => this.sendAudio(pcm), () => this.handleLocalSpeechStart(), (streamId) => this.sendControl({
						type: "voice.playback-drained",
						streamId
					}));
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
				this.sendControl({ type: "voice.cancel-response" });
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
							protocol: VOICE_PROTOCOL,
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
							target: { sessionId },
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
						this.lastOutputStreamId = Math.max(this.lastOutputStreamId, message.streamId);
						this.audio?.clear(message.streamId);
						return;
					case "voice.playback-finalize":
						this.audio?.finalize(message.streamId);
						return;
					case "voice.agent-status":
						this.update({
							...this.snapshot,
							agentRunning: message.running,
							...message.summary === void 0 ? {} : { agentSummary: message.summary }
						});
						return;
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
				this.sendControl({ type: "voice.cancel-response" });
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
				try {
					const response = await fetch(VOICE_INBOX_ROUTE, { cache: "no-store" });
					if (!response.ok) return;
					const snapshot = await response.json();
					if (snapshot.protocol !== "dsh.voice.v1" || !Array.isArray(snapshot.entries)) return;
					const live = new Set(snapshot.entries.map((entry) => entry.id));
					this.update({
						...this.snapshot,
						inbox: snapshot.entries,
						inboxSelection: this.snapshot.inboxSelection.filter((id) => live.has(id))
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
		const MAX_HANDOFF_SKILL_LENGTH = 128;
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
				handoffSkill: DEFAULT_HANDOFF_SKILL_NAME,
				handoffInstructions: "",
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
				if (trimmed !== "" && !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(trimmed)) return;
				await this.writeSetting("handoffSkill", trimmed, "DSH 没有接受该汇报 Skill 设置。");
			}
			async setHandoffInstructions(handoffInstructions) {
				const trimmed = handoffInstructions.trim();
				if (trimmed.length > MAX_HANDOFF_INSTRUCTIONS_LENGTH) return;
				await this.writeSetting("handoffInstructions", trimmed, "DSH 没有接受该汇报指令。");
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
				const handoffSkill = scope.value?.handoffSkill ?? "dsh-voice-supervisor";
				const handoffInstructions = scope.value?.handoffInstructions ?? "";
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
				handoffSkill: rawHandoffSkill ?? "dsh-voice-supervisor",
				handoffInstructions: rawHandoffInstructions ?? "",
				...typeof apiKeyEnv === "string" ? { apiKeyEnv } : {}
			};
		}
		function optionalBoundedInteger(value, fallback, min = 0, max = 6e5) {
			if (value === void 0) return fallback;
			if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return void 0;
			return value;
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
		const css = ".av_iAa_callButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);cursor:pointer;border:0;border-radius:999px;flex:none;order:100;place-items:center;width:34px;height:34px;padding:0;transition:color .12s,background .12s,transform .12s,box-shadow .12s;display:inline-grid;transform:translateY(-2px)}.av_iAa_callButton:hover{background:var(--dsw-alias-button-info-hover,#2f55dc)}.av_iAa_callButton:active{transform:translateY(-2px)scale(.94)}.av_iAa_callButton:disabled{color:color-mix(in srgb, currentColor 48%, transparent);background:color-mix(in srgb, var(--dsw-alias-surface-secondary,#eef0f5) 90%, transparent);cursor:not-allowed;box-shadow:none}.av_iAa_callButtonActive{color:var(--dsw-alias-button-danger-text,#fff);background:var(--dsw-alias-button-danger-fill,#e5484d);box-shadow:0 0 0 4px color-mix(in srgb, var(--dsw-alias-button-danger-fill,#e5484d) 18%, transparent)}.av_iAa_icon{fill:none;stroke:currentColor;stroke-width:1.55px;stroke-linecap:round;stroke-linejoin:round;width:17px;height:17px}.av_iAa_stopGlyph{background:currentColor;border-radius:2px;width:8px;height:8px}.av_iAa_overlay{border:1px solid var(--dsw-alias-border-subtle);width:min(372px,100vw - 40px);max-height:min(620px,100vh - 24px);color:var(--dsw-alias-text-primary);background:color-mix(in srgb, var(--dsw-alias-surface-primary) 94%, transparent);backdrop-filter:blur(18px);will-change:left, top;border-radius:18px;flex-direction:column;padding:16px;display:flex;position:fixed;top:72px;right:20px;overflow:hidden;box-shadow:0 18px 56px #0000002e}.av_iAa_overlayError{gap:14px;width:min(372px,100vw - 40px)}.av_iAa_dragHandle,.av_iAa_voiceOrb{touch-action:none;user-select:none;cursor:grab}.av_iAa_dragging,.av_iAa_dragging .av_iAa_dragHandle{cursor:grabbing;transition:none!important}.av_iAa_voiceOrb{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-surface-primary,#fff) 88%, transparent);width:76px;height:76px;box-shadow:0 14px 38px #00000038, 0 0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 10%, transparent);backdrop-filter:blur(18px);will-change:left, top;border-radius:50%;padding:0;position:fixed;bottom:20px;right:20px;overflow:hidden}.av_iAa_voiceOrb[data-phase=speaking]{box-shadow:0 14px 38px #00000038, 0 0 0 8px color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 17%, transparent)}.av_iAa_orbButton{border-radius:inherit;color:#fff;width:100%;height:100%;cursor:inherit;background:radial-gradient(circle at 35% 28%,#7390ff 0,#3964fe 44%,#2747c9 100%);border:0;place-content:center;gap:5px;padding:0;display:grid}.av_iAa_orbWaves{justify-content:center;align-items:center;gap:3px;height:22px;display:flex}.av_iAa_orbWaves i{opacity:.92;background:currentColor;border-radius:999px;width:3px;height:8px;animation:.85s ease-in-out infinite alternate av_iAa_voice-wave;display:block}.av_iAa_orbWaves i:nth-child(2),.av_iAa_orbWaves i:nth-child(4){height:15px;animation-delay:-240ms}.av_iAa_orbWaves i:nth-child(3){height:21px;animation-delay:-420ms}.av_iAa_voiceOrb[data-phase=listening] .av_iAa_orbWaves i,.av_iAa_voiceOrb[data-phase=agent-working] .av_iAa_orbWaves i{animation-duration:1.25s}.av_iAa_orbTime{font-variant-numeric:tabular-nums;opacity:.86;font-size:10px}@keyframes av_iAa_voice-wave{0%{opacity:.62;transform:scaleY(.55)}to{opacity:1;transform:scaleY(1.15)}}.av_iAa_overlayHeader,.av_iAa_controls{justify-content:space-between;align-items:center;gap:10px;display:flex}.av_iAa_overlayHeader{border-radius:12px;margin:-8px -8px 0;padding:8px}.av_iAa_headerActions{align-items:center;gap:8px;display:flex}.av_iAa_iconButton{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));width:28px;height:28px;color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-surface-primary));cursor:pointer;border-radius:999px;font-size:20px;line-height:1}.av_iAa_eyebrow{color:var(--dsw-alias-text-secondary);margin-bottom:4px;font-size:12px;font-weight:600}.av_iAa_phaseLine{align-items:center;gap:7px;font-size:15px;font-weight:600;display:flex}.av_iAa_liveDot{background:var(--dsw-alias-status-success,#30a46c);width:8px;height:8px;box-shadow:0 0 0 5px color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 18%, transparent);border-radius:50%}.av_iAa_agentState{color:var(--dsw-alias-text-secondary);background:var(--dsw-alias-fill-subtle);border-radius:999px;padding:6px 10px;font-size:12px}.av_iAa_bindingCard{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-fill-subtle));border-radius:12px;margin-top:14px;padding:12px}.av_iAa_bindingLabel,.av_iAa_speakerLabel{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:11px;font-weight:600}.av_iAa_bindingTitle{color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));text-overflow:ellipsis;white-space:nowrap;margin-top:3px;font-size:14px;font-weight:600;overflow:hidden}.av_iAa_bindingMeta{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin-top:5px;font-size:11px;line-height:1.45}.av_iAa_returnLink{color:var(--dsw-alias-brand-primary,#3964fe);cursor:pointer;background:0 0;border:0;margin-top:8px;padding:0;font-size:12px}.av_iAa_transcripts{align-content:start;gap:12px;min-height:120px;max-height:230px;margin:14px 0;padding:2px 4px 2px 2px;display:grid;overflow-y:auto}.av_iAa_transcriptBlock{background:var(--dsw-alias-fill-subtle,var(--dsw-alias-bg-layer-3));border-radius:12px;gap:4px;padding:10px 12px;display:grid}.av_iAa_userText,.av_iAa_assistantText{margin:0;line-height:1.5}.av_iAa_userText{color:var(--dsw-alias-text-secondary);font-size:13px}.av_iAa_assistantText{font-size:15px}.av_iAa_agentSummary{border-left:3px solid var(--dsw-alias-brand-primary,#3964fe);max-height:120px;color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-fill-subtle));border-radius:0 10px 10px 0;gap:5px;margin-bottom:12px;padding:10px 12px;font-size:12px;line-height:1.5;display:grid;overflow-y:auto}.av_iAa_interactionCard{border:1px solid color-mix(in srgb, var(--dsw-alias-status-warning,#f2a20c) 55%, var(--dsw-alias-border-subtle));background:color-mix(in srgb, var(--dsw-alias-status-warning,#f2a20c) 8%, var(--dsw-alias-surface-primary));border-radius:12px;gap:8px;max-height:230px;margin-bottom:12px;padding:11px 12px;font-size:12px;display:grid;overflow-y:auto}.av_iAa_interactionTitle{font-size:13px;font-weight:600}.av_iAa_interactionDetail{color:var(--dsw-alias-label-secondary,var(--dsw-alias-text-secondary));margin:0;line-height:1.45}.av_iAa_interactionActions{justify-content:flex-end;gap:8px;display:flex}.av_iAa_allowButton,.av_iAa_rejectButton{font:inherit;cursor:pointer;border:1px solid #0000;border-radius:999px;padding:6px 11px}.av_iAa_allowButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe)}.av_iAa_rejectButton{color:var(--dsw-alias-text-primary);border-color:var(--dsw-alias-border-subtle);background:var(--dsw-alias-surface-primary)}.av_iAa_questionBlock{border-top:1px solid var(--dsw-alias-border-subtle);gap:6px;padding-top:7px;display:grid}.av_iAa_questionOption{cursor:pointer;align-items:flex-start;gap:7px;line-height:1.4;display:flex}.av_iAa_questionCustom{border:1px solid var(--dsw-alias-border-subtle);min-width:0;height:32px;color:var(--dsw-alias-text-primary);background:var(--dsw-alias-surface-primary);font:inherit;border-radius:8px;padding:0 9px}.av_iAa_controls{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));flex-wrap:wrap;justify-content:flex-end;margin-top:auto;padding-top:12px}.av_iAa_secondaryButton,.av_iAa_endButton{border:1px solid var(--dsw-alias-border-subtle);color:var(--dsw-alias-text-primary);background:var(--dsw-alias-surface-primary);cursor:pointer;border-radius:999px;padding:7px 12px}.av_iAa_endButton{color:#fff;background:var(--dsw-alias-button-danger-fill,#e5484d);border-color:#0000}.av_iAa_inlineError,.av_iAa_errorText{color:var(--dsw-alias-status-danger-text,#d13438);font-size:13px}.av_iAa_errorText{flex:1}.av_iAa_settingsCard{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-surface-primary));border-radius:12px;list-style:none}.av_iAa_settingsCardHeader{align-items:center;gap:12px;padding:14px 16px;display:flex}.av_iAa_settingsCardIcon{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);border-radius:10px;flex:none;place-items:center;width:34px;height:34px;display:grid}.av_iAa_settingsCardHeading{gap:3px;min-width:0;display:grid}.av_iAa_settingsCardHeading strong{font-size:15px}.av_iAa_settingsCardHeading span{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:13px;line-height:1.45}.av_iAa_settingsCardBody{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin:0 16px;padding:14px 0 16px}.av_iAa_settingsLabel{margin-bottom:9px;font-size:13px;font-weight:600}.av_iAa_modelSwitch{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.av_iAa_modelSwitchThree{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;display:grid}.av_iAa_modelChoice{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));min-width:0;color:inherit;background:var(--dsw-alias-bg-layer-2,transparent);text-align:left;cursor:pointer;border-radius:10px;padding:11px 34px 11px 12px;position:relative}.av_iAa_modelChoiceSelected{border-color:var(--dsw-alias-brand-primary,#3964fe);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_modelChoice:disabled{opacity:.55;cursor:default}.av_iAa_modelChoiceTitle,.av_iAa_modelChoiceDetail{display:block}.av_iAa_modelChoiceTitle{font-size:14px;font-weight:600}.av_iAa_modelChoiceDetail{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin-top:4px;font-size:11px;line-height:1.4}.av_iAa_radioDot{border:1px solid var(--dsw-alias-label-dimmed,#8a8f98);border-radius:50%;width:12px;height:12px;position:absolute;top:13px;right:12px}.av_iAa_modelChoiceSelected .av_iAa_radioDot{border:4px solid var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_settingsHint,.av_iAa_settingsError{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));margin:9px 0 0;font-size:12px;line-height:1.5}.av_iAa_settingsSubsection{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin-top:14px;padding-top:14px}.av_iAa_settingsError{color:var(--dsw-alias-label-error,#d13438)}.av_iAa_numberRow{gap:12px;margin-top:12px;display:flex}.av_iAa_numberField{flex:1;gap:6px;min-width:0;display:grid}.av_iAa_numberFieldLabel{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:12px}.av_iAa_numberFieldInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));border-radius:8px;align-items:center;gap:6px;height:34px;padding:0 10px;display:flex}.av_iAa_numberInput{width:100%;min-width:0;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));font:inherit;background:0 0;border:0;outline:none;font-size:13px}.av_iAa_numberSuffix{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));flex:none;font-size:12px}.av_iAa_numberFieldInput:has(.av_iAa_numberInput:disabled){opacity:.5}.av_iAa_selectField{gap:6px;display:grid}.av_iAa_selectInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));height:34px;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;padding:0 10px;font-size:13px}.av_iAa_selectInput:disabled{opacity:.5}.av_iAa_toggleRow{align-items:center;gap:8px;height:34px;display:flex}.av_iAa_toggle{background:var(--dsw-alias-border-l2,#d5d8de);cursor:pointer;border:0;border-radius:11px;flex:none;width:40px;height:22px;padding:0;transition:background .15s;position:relative}.av_iAa_toggle:disabled{opacity:.5;cursor:default}.av_iAa_toggleOn{background:var(--dsw-alias-button-info-fill,#3964fe)}.av_iAa_toggleKnob{background:#fff;border-radius:50%;width:18px;height:18px;transition:transform .15s;position:absolute;top:2px;left:2px}.av_iAa_toggleOn .av_iAa_toggleKnob{transform:translate(18px)}.av_iAa_toggleCaption{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));font-size:12px}.av_iAa_styleField{gap:6px;margin-top:12px;display:grid}.av_iAa_styleInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));resize:vertical;width:100%;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;outline:none;padding:9px 10px;font-size:13px;line-height:1.5}.av_iAa_styleInput:focus{border-color:var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_styleInput:disabled{opacity:.5}.av_iAa_credentialSection{border-top:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));margin-top:14px;padding-top:14px}.av_iAa_credentialStatus{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-text-secondary));align-items:center;gap:7px;margin-bottom:9px;font-size:12px;display:flex}.av_iAa_credentialDot{background:var(--dsw-alias-label-error,#d13438);border-radius:50%;flex:none;width:7px;height:7px}.av_iAa_credentialStatus[data-configured] .av_iAa_credentialDot{background:var(--dsw-alias-status-success,#30a46c);box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-status-success,#30a46c) 14%, transparent)}.av_iAa_credentialInputRow{gap:8px;display:flex}.av_iAa_credentialInput{border:1px solid var(--dsw-alias-border-l2,var(--dsw-alias-border-subtle));min-width:0;height:36px;color:var(--dsw-alias-label-primary,var(--dsw-alias-text-primary));background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-surface-primary));font:inherit;border-radius:8px;outline:none;flex:1;padding:0 11px;font-size:13px}.av_iAa_credentialInput:focus{border-color:var(--dsw-alias-brand-primary,#3964fe)}.av_iAa_credentialSave{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);height:36px;font:inherit;cursor:pointer;border:0;border-radius:8px;flex:none;padding:0 13px;font-size:13px}.av_iAa_credentialSave:disabled,.av_iAa_credentialInput:disabled{opacity:.5;cursor:default}.av_iAa_overlayIncoming{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#3964fe) 42%, transparent);gap:10px;box-shadow:0 18px 42px #0f172a38}.av_iAa_incomingHeader{cursor:grab;justify-content:space-between;align-items:flex-start;gap:10px;display:flex}.av_iAa_ringDot{background:var(--dsw-alias-button-info-fill,#3964fe);border-radius:999px;width:8px;height:8px;animation:1.4s ease-out infinite av_iAa_ringPulse;box-shadow:0 0 #3964fe8c}@keyframes av_iAa_ringPulse{0%{box-shadow:0 0 #3964fe8c}70%{box-shadow:0 0 0 9px #3964fe00}to{box-shadow:0 0 #3964fe00}}.av_iAa_incomingList{flex-direction:column;gap:6px;max-height:260px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.av_iAa_incomingRow{border:1px solid var(--dsw-alias-border-secondary,#0f172a1a);background:var(--dsw-alias-bg-secondary,#0f172a05);border-radius:10px;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.av_iAa_incomingLabel{cursor:pointer;align-items:center;gap:8px;display:flex}.av_iAa_incomingTitle{color:var(--dsw-alias-text-primary,#0f172a);text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;overflow:hidden}.av_iAa_incomingMeta{color:var(--dsw-alias-text-tertiary,#64748b);text-overflow:ellipsis;white-space:nowrap;align-items:center;gap:6px;font-size:12px;display:flex;overflow:hidden}.av_iAa_incomingStatus{color:var(--dsw-alias-brand-primary,#3964fe);background:#3964fe1f;border-radius:999px;flex:none;padding:1px 6px;font-size:11px}.av_iAa_incomingStatus[data-status=failed]{color:#dc2626;background:#dc26261f}.av_iAa_incomingStatus[data-status=cancelled]{color:#64748b;background:#64748b29}.av_iAa_incomingActions{color:var(--dsw-alias-text-tertiary,#94a3b8);justify-content:space-between;align-items:center;gap:8px;font-size:11px;display:flex}.av_iAa_incomingTime{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.av_iAa_linkButton{color:var(--dsw-alias-brand-primary,#3964fe);font:inherit;cursor:pointer;background:0 0;border:0;flex:none;padding:0;font-size:11px}.av_iAa_incomingFooter{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.av_iAa_answerButton{color:#fff;background:var(--dsw-alias-button-info-fill,#3964fe);min-width:96px;height:34px;font:inherit;cursor:pointer;border:0;border-radius:999px;flex:1;font-size:13px}.av_iAa_answerButton:disabled{opacity:.5;cursor:default}.av_iAa_incomingHint{color:var(--dsw-alias-text-tertiary,#94a3b8);flex-basis:100%;font-size:11px}.av_iAa_incomingNotice{color:var(--dsw-alias-text-secondary,#475569);background:#3964fe14;border-radius:8px;padding:6px 10px;font-size:12px}@media (width<=1199px){.av_iAa_overlay{border-radius:16px;width:min(420px,100vw - 24px);max-height:min(560px,100vh - 24px);padding:14px;top:auto;bottom:12px;right:12px}.av_iAa_voiceOrb{bottom:12px;right:12px}.av_iAa_controls{justify-content:stretch}.av_iAa_secondaryButton,.av_iAa_endButton{flex:1}}@media (width<=520px){.av_iAa_modelSwitch,.av_iAa_modelSwitchThree{grid-template-columns:1fr}.av_iAa_numberRow{flex-direction:column;gap:10px}}";
		const styleId = "@harness-remote/dsh-realtime-voice/voice.module.css";
		if (typeof document !== "undefined" && !document.querySelector(`style[data-plugin-css="${styleId}"]`)) {
			const style = document.createElement("style");
			style.dataset.plugin = "@harness-remote/dsh-realtime-voice";
			style.dataset.pluginCss = styleId;
			style.textContent = css;
			document.head.appendChild(style);
		}
		var voice_module_css_default = {
			"overlay": "av_iAa_overlay",
			"eyebrow": "av_iAa_eyebrow",
			"interactionDetail": "av_iAa_interactionDetail",
			"secondaryButton": "av_iAa_secondaryButton",
			"agentSummary": "av_iAa_agentSummary",
			"settingsSubsection": "av_iAa_settingsSubsection",
			"iconButton": "av_iAa_iconButton",
			"selectField": "av_iAa_selectField",
			"icon": "av_iAa_icon",
			"interactionActions": "av_iAa_interactionActions",
			"toggleRow": "av_iAa_toggleRow",
			"orbButton": "av_iAa_orbButton",
			"transcripts": "av_iAa_transcripts",
			"numberRow": "av_iAa_numberRow",
			"voice-wave": "av_iAa_voice-wave",
			"styleField": "av_iAa_styleField",
			"callButton": "av_iAa_callButton",
			"dragHandle": "av_iAa_dragHandle",
			"radioDot": "av_iAa_radioDot",
			"settingsCardBody": "av_iAa_settingsCardBody",
			"styleInput": "av_iAa_styleInput",
			"questionOption": "av_iAa_questionOption",
			"incomingTitle": "av_iAa_incomingTitle",
			"transcriptBlock": "av_iAa_transcriptBlock",
			"incomingHeader": "av_iAa_incomingHeader",
			"incomingTime": "av_iAa_incomingTime",
			"overlayError": "av_iAa_overlayError",
			"toggleKnob": "av_iAa_toggleKnob",
			"ringDot": "av_iAa_ringDot",
			"questionCustom": "av_iAa_questionCustom",
			"numberSuffix": "av_iAa_numberSuffix",
			"speakerLabel": "av_iAa_speakerLabel",
			"modelSwitchThree": "av_iAa_modelSwitchThree",
			"modelChoiceDetail": "av_iAa_modelChoiceDetail",
			"credentialInput": "av_iAa_credentialInput",
			"endButton": "av_iAa_endButton",
			"incomingActions": "av_iAa_incomingActions",
			"orbTime": "av_iAa_orbTime",
			"questionBlock": "av_iAa_questionBlock",
			"callButtonActive": "av_iAa_callButtonActive",
			"credentialInputRow": "av_iAa_credentialInputRow",
			"credentialSave": "av_iAa_credentialSave",
			"modelSwitch": "av_iAa_modelSwitch",
			"returnLink": "av_iAa_returnLink",
			"stopGlyph": "av_iAa_stopGlyph",
			"rejectButton": "av_iAa_rejectButton",
			"modelChoiceTitle": "av_iAa_modelChoiceTitle",
			"toggleCaption": "av_iAa_toggleCaption",
			"overlayIncoming": "av_iAa_overlayIncoming",
			"ringPulse": "av_iAa_ringPulse",
			"settingsHint": "av_iAa_settingsHint",
			"dragging": "av_iAa_dragging",
			"voiceOrb": "av_iAa_voiceOrb",
			"headerActions": "av_iAa_headerActions",
			"assistantText": "av_iAa_assistantText",
			"userText": "av_iAa_userText",
			"incomingFooter": "av_iAa_incomingFooter",
			"selectInput": "av_iAa_selectInput",
			"credentialDot": "av_iAa_credentialDot",
			"interactionCard": "av_iAa_interactionCard",
			"credentialSection": "av_iAa_credentialSection",
			"incomingHint": "av_iAa_incomingHint",
			"agentState": "av_iAa_agentState",
			"settingsCard": "av_iAa_settingsCard",
			"bindingLabel": "av_iAa_bindingLabel",
			"incomingRow": "av_iAa_incomingRow",
			"incomingStatus": "av_iAa_incomingStatus",
			"toggleOn": "av_iAa_toggleOn",
			"incomingMeta": "av_iAa_incomingMeta",
			"incomingNotice": "av_iAa_incomingNotice",
			"bindingTitle": "av_iAa_bindingTitle",
			"numberInput": "av_iAa_numberInput",
			"numberField": "av_iAa_numberField",
			"settingsCardHeader": "av_iAa_settingsCardHeader",
			"bindingCard": "av_iAa_bindingCard",
			"settingsCardIcon": "av_iAa_settingsCardIcon",
			"incomingLabel": "av_iAa_incomingLabel",
			"linkButton": "av_iAa_linkButton",
			"incomingList": "av_iAa_incomingList",
			"errorText": "av_iAa_errorText",
			"answerButton": "av_iAa_answerButton",
			"numberFieldLabel": "av_iAa_numberFieldLabel",
			"phaseLine": "av_iAa_phaseLine",
			"inlineError": "av_iAa_inlineError",
			"settingsError": "av_iAa_settingsError",
			"numberFieldInput": "av_iAa_numberFieldInput",
			"controls": "av_iAa_controls",
			"toggle": "av_iAa_toggle",
			"orbWaves": "av_iAa_orbWaves",
			"credentialStatus": "av_iAa_credentialStatus",
			"overlayHeader": "av_iAa_overlayHeader",
			"settingsLabel": "av_iAa_settingsLabel",
			"interactionTitle": "av_iAa_interactionTitle",
			"modelChoiceSelected": "av_iAa_modelChoiceSelected",
			"liveDot": "av_iAa_liveDot",
			"modelChoice": "av_iAa_modelChoice",
			"settingsCardHeading": "av_iAa_settingsCardHeading",
			"allowButton": "av_iAa_allowButton",
			"bindingMeta": "av_iAa_bindingMeta"
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
		//#region src/client/ringtone.ts
		/**
		* Short synthesized ring for an incoming voice report.
		*
		* Synthesizing avoids shipping and decoding an audio asset, and keeps the
		* payload free of any third-party sample. Browsers require a user gesture
		* before audio may start, so a blocked context is a normal, silent outcome:
		* the list is still visible and the user can take the call manually.
		*/
		const RINGTONE_DURATION_MS = 5e3;
		/** Offsets of the beeps inside one ring, in milliseconds. */
		const BEEP_OFFSETS_MS = [
			0,
			250,
			1200,
			1450,
			2400,
			2650,
			3600,
			3850
		];
		const BEEP_DURATION_SECONDS = .18;
		const BEEP_FREQUENCY_HZ = 660;
		const BEEP_PEAK_GAIN = .12;
		/**
		* Play one five-second ring.
		*
		* @returns a stop function, or undefined when the browser cannot play audio.
		*/
		function playRingtone() {
			const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (Ctor === void 0) return void 0;
			let context;
			try {
				context = new Ctor();
			} catch {
				return;
			}
			const oscillators = [];
			for (const offset of BEEP_OFFSETS_MS) try {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				const start = context.currentTime + offset / 1e3;
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
			} catch {
				continue;
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
		/** Root-level movable call surface that remains visible while the user changes DSH sessions. */
		function VoiceOverlay({ useVoice, useSessions, end, toggleMute, cancelResponse, answerApproval, answerQuestion, answerInbox, toggleInboxSelection, selectAllInbox, clearInboxSelection, dismissInbox, openSession }) {
			const voice = useVoice((snapshot) => snapshot);
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
			const rungRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const newWaitingIds = waiting.map((entry) => entry.id).filter((id) => !rungRef.current.has(id));
			(0, react.useEffect)(() => {
				if (voice.phase !== "idle" || newWaitingIds.length === 0) return;
				for (const id of newWaitingIds) rungRef.current.add(id);
				const stop = playRingtone();
				if (stop === void 0) return;
				const timer = setTimeout(stop, RINGTONE_DURATION_MS);
				return () => {
					clearTimeout(timer);
					stop();
				};
			}, [newWaitingIds.join(","), voice.phase]);
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
			const beginDrag = (event) => {
				if (event.button !== 0 || panelRef.current === null) return;
				if (!collapsed && event.target.closest("button") !== null) return;
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
			if (voice.phase === "idle") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				ref: panelRef,
				className: `${voice_module_css_default.overlay} ${voice_module_css_default.overlayIncoming} ${dragging ? voice_module_css_default.dragging : ""}`,
				style: floatingStyle,
				"aria-label": "待接听的语音汇报",
				onPointerDown: beginDrag,
				onPointerMove: moveDrag,
				onPointerUp: endDrag,
				onPointerCancel: endDrag,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallBackList, {
					waiting,
					selection: voice.inboxSelection,
					onToggle: toggleInboxSelection,
					onSelectAll: selectAllInbox,
					onClearSelection: clearInboxSelection,
					onDismiss: dismissInbox,
					onAnswer: () => answerInbox()
				})
			});
			if (collapsed && voice.phase !== "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				ref: panelRef,
				className: `${voice_module_css_default.voiceOrb} ${dragging ? voice_module_css_default.dragging : ""}`,
				style: floatingStyle,
				"data-phase": voice.phase,
				"aria-label": `实时语音：${phaseText(voice.phase)}`,
				onPointerDown: beginDrag,
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
		function CallBackList(props) {
			const allSelected = props.selection.length === props.waiting.length && props.waiting.length > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: voice_module_css_default.incomingHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: voice_module_css_default.eyebrow,
						children: "DSH 实时语音"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: voice_module_css_default.phaseLine,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: voice_module_css_default.ringDot }),
							props.waiting.length,
							" 个任务已完成，等待汇报"
						]
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: voice_module_css_default.iconButton,
						"aria-label": "清空选择",
						title: "清空选择",
						onClick: props.onClearSelection,
						children: "×"
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: voice_module_css_default.incomingList,
					children: props.waiting.map((entry) => {
						const checked = props.selection.includes(entry.id);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: voice_module_css_default.incomingRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: voice_module_css_default.incomingLabel,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked,
										onChange: () => props.onToggle(entry.id)
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
										children: inboxStatusText(entry.status)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.sessionTitle === void 0 ? entry.request.slice(0, 60) : entry.request.slice(0, 40) })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: voice_module_css_default.incomingActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: voice_module_css_default.incomingTime,
										children: [
											inboxAgeText(entry.createdAt),
											" · ",
											inboxDurationText(entry.durationMs)
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: voice_module_css_default.linkButton,
										onClick: () => props.onDismiss([entry.id]),
										children: "已读"
									})]
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
							onClick: () => props.onDismiss(props.waiting.map((entry) => entry.id)),
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
							children: "5 秒后自动静音，任务会留在列表里；想稍后再听时再点接听。"
						})
					]
				})
			] });
		}
		function inboxStatusText(status) {
			if (status === "completed") return "已完成";
			if (status === "cancelled") return "已取消";
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
		//#region src/client/VoiceSettingsCard.tsx
		/** One native Plugins-settings card. Changes persist immediately and affect the next call. */
		function VoiceSettingsCard({ useVoiceModelSettings, selectModel, selectTurnDetection, selectVoice, setVadThreshold, setSilenceDuration, setMaxHistoryTurns, setSpeechEmotion, setStylePrompt, selectProgressReporting, setProgressMinInterval, setProgressQuietTask, setHandoffSkill, setHandoffInstructions, saveApiKey }) {
			const state = useVoiceModelSettings((snapshot) => snapshot);
			const [apiKey, setApiKey] = (0, react.useState)("");
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
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										className: voice_module_css_default.selectInput,
										value: state.voice,
										disabled,
										onChange: (event) => selectVoice(event.target.value),
										children: REALTIME_VOICE_VOICES.map((voice) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: voice,
											children: realtimeVoiceVoiceLabel(voice)
										}, voice))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "音色只能在建立连接时设置一次；已进行的通话不受影响。"
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
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: voice_module_css_default.settingsHint,
									children: "填写 DSH 已安装的 Skill 名。每次把任务交给执行 Agent 时，这段 Skill 正文会随任务一起下发， 用来规定它怎么汇报进展、先看什么、怎么安排工作。留空表示不附加。"
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
					children: "汇报 Skill 名称（可留空）"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: voice_module_css_default.numberFieldInput,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						className: voice_module_css_default.numberInput,
						spellCheck: false,
						autoComplete: "off",
						maxLength: 128,
						placeholder: "例如：dsh-voice-supervisor",
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
				id: "realtime-voice",
				order: 100,
				inject: () => ({
					hooks: { voice },
					end: () => voice.end(),
					toggleMute: () => voice.toggleMute(),
					cancelResponse: () => voice.cancelResponse(),
					answerInbox: (sessionId) => {
						voice.answerInbox(sessionId);
					},
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