import { describe, expect, it } from 'vitest'
import { LocalVoiceActivityDetector } from '../src/client/local-vad.ts'

describe('local voice activity onset', () => {
  it('requires sustained voice before it fires, so speaker bleed cannot trip it', () => {
    const detector = new LocalVoiceActivityDetector()
    const voice = pcm(5_000)
    const silence = pcm(0)

    // Three frames of voice is 120ms - less than a person says when they
    // interrupt, and about as long as the AI's own opening audio leaks back.
    for (let index = 0; index < 3; index += 1) expect(detector.push(voice)).toBe(false)
    expect(detector.push(voice)).toBe(true)
    expect(detector.push(voice)).toBe(false)
    for (let index = 0; index < 5; index += 1) expect(detector.push(silence)).toBe(false)
    for (let index = 0; index < 3; index += 1) expect(detector.push(voice)).toBe(false)
    expect(detector.push(voice)).toBe(true)
  })

  it('ignores low-level background noise', () => {
    const detector = new LocalVoiceActivityDetector()
    for (let index = 0; index < 20; index += 1) expect(detector.push(pcm(300))).toBe(false)
  })
})

function pcm(amplitude: number): ArrayBuffer {
  const samples = new Int16Array(640)
  samples.fill(amplitude)
  return samples.buffer
}
