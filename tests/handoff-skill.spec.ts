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
