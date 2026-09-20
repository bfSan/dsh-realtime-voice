import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/host/config.ts'
import { DEFAULT_HANDOFF_SKILL_NAME } from '../src/models.ts'
import {
  MAX_HANDOFF_GUIDANCE_LENGTH,
  resolveHandoffGuidance,
} from '../src/host/handoff-guidance.ts'

function contextWithSkill(content: string | undefined, skillName = 'voice-supervisor') {
  const warn = vi.fn()
  const get = vi.fn(async (name: string) => {
    if (content === undefined || name !== skillName) return undefined
    return { name: skillName, description: 'voice reporting rules', content }
  })
  return { context: { skills: { get }, logger: { warn } }, get, warn }
}

describe('voice handoff guidance', () => {
  it('defaults to no guidance at all, so a fresh install attaches nothing', () => {
    const config = new Config({})
    expect(config.handoffSkill).toBe('')
    expect(config.handoffInstructions).toBe('')
  })

  it('still resolves the built-in skill when the operator names it explicitly', async () => {
    const { context, get } = contextWithSkill('内置汇报规范', DEFAULT_HANDOFF_SKILL_NAME)

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: DEFAULT_HANDOFF_SKILL_NAME }),
      {},
    )

    expect(get).toHaveBeenCalledWith(DEFAULT_HANDOFF_SKILL_NAME, expect.anything())
    expect(guidance.body).toBe('内置汇报规范')
  })

  it('reads guidance straight from a file path instead of the skill registry', async () => {
    const get = vi.fn(async () => undefined)
    const readFile = vi.fn(async () => '# 汇报规范\n\n先给结论，最多两句。\n')

    const guidance = await resolveHandoffGuidance(
      { skills: { get }, readFile, logger: { warn: vi.fn() } },
      new Config({ handoffSkill: '/Users/someone/skills/supervisor/SKILL.md' }),
      {},
    )

    expect(readFile).toHaveBeenCalledWith('/Users/someone/skills/supervisor/SKILL.md')
    expect(get).not.toHaveBeenCalled()
    expect(guidance.body).toContain('先给结论')
  })

  it('strips SKILL.md frontmatter so only the operator body reaches the Agent', async () => {
    const readFile = vi.fn(async () => '---\nname: voice-supervisor\ndescription: rules\n---\n\n正文第一句。\n')

    const guidance = await resolveHandoffGuidance(
      { readFile, logger: { warn: vi.fn() } },
      new Config({ handoffSkill: './my-skill/SKILL.md' }),
      {},
    )

    expect(guidance.body).toBe('正文第一句。')
  })

  it('treats a missing guidance file as no guidance and warns', async () => {
    const warn = vi.fn()
    const readFile = vi.fn(async () => { throw new Error('ENOENT: no such file') })

    const guidance = await resolveHandoffGuidance(
      { readFile, logger: { warn } },
      new Config({ handoffSkill: '/nope/missing.md', handoffInstructions: '兜底指令' }),
      {},
    )

    expect(guidance.body).toBe('兜底指令')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing.md'))
  })

  it('loads the configured DSH skill and passes its body through', async () => {
    const { context, get } = contextWithSkill('每次汇报控制在两句话内，先给结论。')

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'voice-supervisor' }),
      {},
    )

    expect(get).toHaveBeenCalledWith('voice-supervisor', expect.anything())
    expect(guidance.body).toContain('先给结论')
  })

  it('passes the working directory so project-scoped skills resolve', async () => {
    const { context, get } = contextWithSkill('body')

    await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'voice-supervisor' }),
      { cwd: '/Users/someone/project' },
    )

    expect(get).toHaveBeenCalledWith('voice-supervisor', expect.objectContaining({ cwd: '/Users/someone/project' }))
  })

  it('keeps the call alive and warns when the configured skill does not exist', async () => {
    const { context, warn } = contextWithSkill(undefined)

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'missing-skill' }),
      {},
    )

    expect(guidance.body).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing-skill'))
  })

  it('keeps the call alive when the skill registry throws', async () => {
    const context = {
      skills: { get: vi.fn(async () => { throw new Error('registry exploded') }) },
      logger: { warn: vi.fn() },
    }

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'broken' }),
      {},
    )

    expect(guidance.body).toBeUndefined()
  })

  it('still applies inline instructions when the skill service is absent', async () => {
    const guidance = await resolveHandoffGuidance(
      { logger: { warn: vi.fn() } },
      new Config({ handoffSkill: 'voice-supervisor', handoffInstructions: '汇报时不要念表格。' }),
      {},
    )

    expect(guidance.body).toBe('汇报时不要念表格。')
  })

  it('places the skill body before inline instructions', async () => {
    const { context } = contextWithSkill('SKILL BODY')

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'voice-supervisor', handoffInstructions: 'INLINE RULES' }),
      {},
    )

    expect(guidance.body).toContain('SKILL BODY')
    expect(guidance.body).toContain('INLINE RULES')
    expect(guidance.body!.indexOf('SKILL BODY')).toBeLessThan(guidance.body!.indexOf('INLINE RULES'))
  })

  it('caps over-long guidance so one setting cannot flood the prompt', async () => {
    const { context } = contextWithSkill('x'.repeat(50_000))

    const guidance = await resolveHandoffGuidance(
      context,
      new Config({ handoffSkill: 'voice-supervisor' }),
      {},
    )

    expect(guidance.body!.length).toBeLessThanOrEqual(MAX_HANDOFF_GUIDANCE_LENGTH)
  })

  it('trims blank whitespace-only configuration down to no guidance', async () => {
    const guidance = await resolveHandoffGuidance(
      { skills: { get: vi.fn(async () => undefined) }, logger: { warn: vi.fn() } },
      new Config({ handoffSkill: '   ', handoffInstructions: '   ' }),
      {},
    )

    expect(guidance.body).toBeUndefined()
  })
})
