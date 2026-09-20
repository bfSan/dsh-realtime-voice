import { describe, expect, it } from 'vitest'
import { Config } from '../src/host/config.ts'
import { buildVoiceInstructions } from '../src/host/voice-bootstrap.ts'

const status = { running: false, blank: true }

describe('realtime voice style prompt', () => {
  it('defaults to no extra style so behaviour is unchanged', () => {
    expect(new Config({}).stylePrompt).toBe('')
  })

  it('appends the user style after the built-in guard rails', () => {
    const instructions = buildVoiceInstructions(status, undefined, {
      stylePrompt: '语速偏慢，称呼我为“老板”，每次回答不超过两句。',
    })
    expect(instructions).toContain('语速偏慢')
    // The style must never be able to displace the safety-critical rules.
    const styleIndex = instructions.indexOf('语速偏慢')
    expect(styleIndex).toBeGreaterThan(instructions.indexOf('handoff_to_dsh_agent'))
    expect(instructions).toContain('[BACKEND][COMPLETE]')
  })

  it('omits the style block when it is empty or whitespace', () => {
    expect(buildVoiceInstructions(status, undefined, { stylePrompt: '   ' }))
      .toBe(buildVoiceInstructions(status))
  })

  it('caps an over-long style so one setting cannot flood the system prompt', () => {
    const instructions = buildVoiceInstructions(status, undefined, {
      stylePrompt: 'x'.repeat(5_000),
    })
    const styleSection = instructions.slice(instructions.indexOf('用户自定义风格'))
    expect(styleSection.length).toBeLessThan(2_100)
  })
})
