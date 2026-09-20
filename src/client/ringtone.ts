/**
 * Short synthesized ring for an incoming voice report.
 *
 * Synthesizing avoids shipping and decoding an audio asset, and keeps the
 * payload free of any third-party sample. Browsers require a user gesture
 * before audio may start, so a blocked context is a normal, silent outcome:
 * the list is still visible and the user can take the call manually.
 */

export const RINGTONE_DURATION_MS = 5_000

/** Offsets of the beeps inside one ring, in milliseconds. */
const BEEP_OFFSETS_MS = [0, 250, 1_200, 1_450, 2_400, 2_650, 3_600, 3_850]
const BEEP_DURATION_SECONDS = 0.18
const BEEP_FREQUENCY_HZ = 660
const BEEP_PEAK_GAIN = 0.12

interface AudioContextLike {
  state: string
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
 * Play one five-second ring.
 *
 * @returns a stop function, or undefined when the browser cannot play audio.
 */
export function playRingtone(): (() => void) | undefined {
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
  for (const offset of BEEP_OFFSETS_MS) {
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + offset / 1_000
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
      continue
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
