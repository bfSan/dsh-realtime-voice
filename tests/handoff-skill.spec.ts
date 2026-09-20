import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HANDOFF_SKILL_CONTENT,
  DEFAULT_HANDOFF_SKILL_NAME,
  defaultHandoffSkill,
  registerDefaultHandoffSkill,
} from '../src/host/handoff-skill.ts'

describe('built-in handoff skill', () => {
  it('ships a kebab-case name, a description and a reporting body', () => {
    const skill = defaultHandoffSkill()
    expect(skill.name).toBe(DEFAULT_HANDOFF_SKILL_NAME)
    expect(skill.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(skill.description.length).toBeGreaterThan(0)
    expect(skill.content).toBe(DEFAULT_HANDOFF_SKILL_CONTENT)
    expect(skill.content).toContain('汇报')
  })

  it('carries every field the registry revalidates when the skill is loaded', () => {
    // `ctx.skills.register()` only defaults `invocation` and `provider`. The
    // registry revalidates the full definition on `get()`, where a missing
    // `source` throws "loaded skill ... source must be a string" - so a
    // definition that registers cleanly can still fail the moment a handoff
    // tries to read it.
    const skill = defaultHandoffSkill()
    expect(skill.source).toBe('runtime')
    // Every string field `validateDefinition` reads, minus `provider` and
    // `invocation`, which `register()` fills in itself.
    for (const field of ['name', 'description', 'content', 'source'] as const) {
      expect(typeof skill[field]).toBe('string')
    }
  })

  it('registers with the skills service and returns its disposer', () => {
    const dispose = vi.fn()
    const register = vi.fn(() => dispose)
    const returned = registerDefaultHandoffSkill({ skills: { register } })
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ name: DEFAULT_HANDOFF_SKILL_NAME }))
    expect(returned).toBe(dispose)
  })

  it('is a no-op when the skills service is absent', () => {
    expect(registerDefaultHandoffSkill({})).toBeUndefined()
  })

  it('reports a refused registration without throwing', () => {
    const warn = vi.fn()
    const returned = registerDefaultHandoffSkill({
      skills: { register: () => { throw new Error('duplicate name') } },
      logger: { warn },
    })
    expect(returned).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate name'))
  })
})
