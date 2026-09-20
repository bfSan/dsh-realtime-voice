/**
 * Short synthesized ring for an incoming voice report.
 *
 * Synthesizing avoids shipping and decoding an audio asset, and keeps the
 * payload free of any third-party sample. Browsers require a user gesture
 * before audio may start, so a blocked context is a normal, silent outcome:
 * the list is still visible and the user can take the call manually.
 */

/** Default ring length; the Host setting overrides it. Zero never rings. */
export const RINGTONE_DURATION_MS = 5_000

/** One ring cycle: two short beeps, then a pause before the pattern repeats. */
const BEEP_OFFSETS_IN_CYCLE_MS = [0, 250]
const CYCLE_MS = 1_200
const BEEP_DURATION_SECONDS = 0.18
const BEEP_FREQUENCY_HZ = 660
const BEEP_PEAK_GAIN = 0.12

interface AudioContextLike {
  currentTime: number
  destination: unknown
  createOscillator(): OscillatorLike
  createGain(): GainLike
  resume?(): Promise<void>
  close?(): Promise<void>
}

interface OscillatorLike {
  type: string
  frequency: { value: number }
  connect(target: unknown): void
  start(when: number): void
  stop(when?: number): void
}

interface GainLike {
  gain: {
    setValueAtTime(value: number, when: number): void
    linearRampToValueAtTime(value: number, when: number): void
  }
  connect(target: unknown): void
}

/**
 * Start a ring of the requested length.
 *
 * @returns a stop function, or undefined when the browser cannot play audio
 *   or the configured duration is zero.
 */
export function playRingtone(durationMs = RINGTONE_DURATION_MS): (() => void) | undefined {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return undefined
  const Ctor = (globalThis as {
    AudioContext?: new () => AudioContextLike
    webkitAudioContext?: new () => AudioContextLike
  }).AudioContext ?? (globalThis as { webkitAudioContext?: new () => AudioContextLike }).webkitAudioContext
  if (Ctor === undefined) return undefined
  let context: AudioContextLike
  try {
    context = new Ctor()
  } catch {
    return undefined
  }
  const oscillators: OscillatorLike[] = []
  for (let cycleStart = 0; cycleStart < durationMs; cycleStart += CYCLE_MS) {
    for (const offsetInCycle of BEEP_OFFSETS_IN_CYCLE_MS) {
      const offset = cycleStart + offsetInCycle
      if (offset >= durationMs) continue
      startBeep(context, offset, oscillators)
    }
  }
  if (oscillators.length === 0) return undefined
  // A suspended context still resolves; the ring simply stays silent.
  void context.resume?.().catch(() => {})
  return () => {
    for (const oscillator of oscillators) {
      try { oscillator.stop() } catch { /* already stopped */ }
    }
    try { void context.close?.() } catch { /* already closed */ }
  }
}

function startBeep(context: AudioContextLike, offsetMs: number, oscillators: OscillatorLike[]): void {
  try {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + offsetMs / 1_000
    const end = start + BEEP_DURATION_SECONDS
    oscillator.type = 'sine'
    oscillator.frequency.value = BEEP_FREQUENCY_HZ
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(BEEP_PEAK_GAIN, start + 0.02)
    gain.gain.linearRampToValueAtTime(0.0001, end)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(end)
    oscillators.push(oscillator)
  } catch {
    // One refused oscillator must not cancel the rest of the ring.
  }
}
