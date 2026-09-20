import type { Context } from '@deepseek-ai/cordis'
import type { VoiceConfig } from './config.ts'

/** One handoff prompt cannot carry unbounded guidance text. */
export const MAX_HANDOFF_GUIDANCE_LENGTH = 8_000

export interface HandoffGuidance {
  /** Resolved guidance, or undefined when nothing is configured. */
  body?: string
  /** Set when the user configured a skill name that could not be loaded. */
  missingSkill?: string
}

export interface HandoffGuidanceContext {
  cwd?: string
}

interface SkillDefinitionLike {
  content?: unknown
}

interface SkillRegistryLike {
  get(name: string, options: { cwd?: string; signal?: AbortSignal }): Promise<SkillDefinitionLike | undefined>
}

/**
 * Resolve the operator-authored guidance that rides along with every voice
 * handoff. A configured DSH skill supplies the body; inline instructions are
 * appended after it so an ad-hoc note can refine a shared skill without
 * editing it.
 *
 * Every failure path degrades to "no guidance" and logs a warning: a mistyped
 * skill name must never be able to reject a user's spoken request.
 */
export async function resolveHandoffGuidance(
  ctx: Context,
  config: VoiceConfig,
  options: HandoffGuidanceContext,
): Promise<HandoffGuidance> {
  const skillName = config.handoffSkill.trim()
  const inline = config.handoffInstructions.trim()
  const skillBody = skillName === '' ? undefined : await loadSkillBody(ctx, skillName, options)
  const sections = [skillBody, inline === '' ? undefined : inline].filter(
    (value): value is string => value !== undefined && value.trim() !== '',
  )
  if (sections.length === 0) {
    return skillName === '' ? {} : { missingSkill: skillName }
  }
  return {
    body: sections.join('\n\n').slice(0, MAX_HANDOFF_GUIDANCE_LENGTH),
    ...(skillName === '' || skillBody !== undefined ? {} : { missingSkill: skillName }),
  }
}

async function loadSkillBody(
  ctx: Context,
  skillName: string,
  options: HandoffGuidanceContext,
): Promise<string | undefined> {
  try {
    // Reading an absent Cordis service throws instead of yielding undefined.
    const skills = (ctx as { skills?: SkillRegistryLike }).skills
    if (skills === undefined) {
      ctx.logger?.warn?.(`[realtime-voice] handoff skill "${skillName}" is configured but the skills service is unavailable`)
      return undefined
    }
    const skill = await skills.get(skillName, {
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    })
    if (skill === undefined) {
      ctx.logger?.warn?.(`[realtime-voice] handoff skill "${skillName}" was not found`)
      return undefined
    }
    return typeof skill.content === 'string' && skill.content.trim() !== '' ? skill.content : undefined
  } catch (error) {
    ctx.logger?.warn?.(
      `[realtime-voice] failed to load handoff skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}
