import { describe, expect, it } from 'vitest'
import { isConfirmationUtterance } from '../src/host/voice-intent.ts'

describe('task confirmation intent', () => {
  it('accepts the short forms a person actually says', () => {
    for (const spoken of ['对', '对，就这个', '是的', '嗯，可以', '就它吧', '确认', '没问题', 'ok', '行，那就这个'])
      expect(isConfirmationUtterance(spoken), spoken).toBe(true)
  })

  it('treats a correction or a refusal as no confirmation', () => {
    for (const spoken of ['不对', '不是这个', '先别', '换一个', '取消', '我再想想', '等会儿再说'])
      expect(isConfirmationUtterance(spoken), spoken).toBe(false)
  })

  it('does not read an unrelated sentence as agreement', () => {
    for (const spoken of ['帮我看看日志', '这个任务先放着', '', '嗯'])
      if (spoken === '嗯') {
        // A bare "嗯" is a real affirmative; it is only ambiguous in writing.
        expect(isConfirmationUtterance(spoken)).toBe(true)
      } else {
        expect(isConfirmationUtterance(spoken), spoken).toBe(false)
      }
  })

  it('confirms when the agreement leads a longer sentence', () => {
    expect(isConfirmationUtterance('对，那就开始吧')).toBe(true)
    expect(isConfirmationUtterance('可以，就这个任务')).toBe(true)
    // The agreement has to lead; a trailing "对" is not an answer.
    expect(isConfirmationUtterance('这个任务我觉得不太对')).toBe(false)
  })
})
