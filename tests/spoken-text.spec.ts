import { describe, expect, it } from 'vitest'
import { hasSpokenContent, toSpokenText } from '../src/host/spoken-text.ts'

describe('spoken text', () => {
  it('keeps the verdict while dropping our own status banner', () => {
    const spoken = toSpokenText('[COMPLETE] 已经创建 hello.txt。')
    expect(spoken).not.toContain('[COMPLETE]')
    // A filename the user asked for survives; dots are too ambiguous with
    // decimals to rewrite safely.
    expect(spoken).toContain('hello.txt')
  })

  it('turns parentheses into pauses instead of spoken glyphs', () => {
    const spoken = toSpokenText('部署完成（共 3 个服务）。')
    expect(spoken).not.toContain('（')
    expect(spoken).not.toContain('）')
    expect(spoken).toContain('共 3 个服务')
  })

  it('drops markdown structure but keeps the words', () => {
    const spoken = toSpokenText([
      '## 结论',
      '',
      '- 第一件事完成',
      '- 第二件事完成',
      '',
      '```ts',
      'const secret = 1',
      '```',
      '',
      '**重点**：没问题。',
    ].join('\n'))
    expect(spoken).toContain('结论')
    expect(spoken).toContain('第一件事完成')
    expect(spoken).not.toContain('#')
    expect(spoken).not.toContain('const secret')
    expect(spoken).not.toContain('*')
  })

  it('counts a long list instead of reading every item', () => {
    const list = Array.from({ length: 9 }, (_, index) => `- 第${index + 1}项`).join('\n')
    const spoken = toSpokenText(list)
    expect(spoken).toContain('第4项')
    expect(spoken).not.toContain('第5项')
    expect(spoken).toContain('其余 5 条')
  })

  it('never reads a path, a url or a hash aloud', () => {
    const spoken = toSpokenText('结果在 /Users/bofeng/project/src/host/inbox.ts，见 https://example.com/a/b，提交 9f3b36b0cabe4843。')
    expect(spoken).not.toContain('/Users/')
    expect(spoken).not.toContain('https://')
    expect(spoken).not.toContain('9f3b36b0cabe4843')
    expect(spoken).toContain('提交')
  })

  it('turns snake_case identifiers into words', () => {
    expect(toSpokenText('调用了 answer_dsh_approval 工具。')).toContain('answer dsh approval')
  })

  it('cuts an over-long report at the tail rather than rewriting it', () => {
    const spoken = toSpokenText('一'.repeat(50), 20)
    expect(spoken.length).toBeLessThanOrEqual(21)
    expect(spoken.endsWith('…')).toBe(true)
    expect(spoken.startsWith('一')).toBe(true)
  })

  it('reports empty input as having nothing to say', () => {
    expect(hasSpokenContent('```\nonly code\n```')).toBe(false)
    expect(hasSpokenContent('   ')).toBe(false)
    expect(hasSpokenContent('完成了。')).toBe(true)
  })
})
