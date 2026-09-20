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

export interface SkillRegistryLike {
  get(name: string, options: { cwd?: string; signal?: AbortSignal }): Promise<SkillDefinitionLike | undefined>
}

/**
 * The optional services guidance resolution reads. Kept as data rather than a
 * Cordis Context because a service that is not declared in `inject` throws on
 * property access, and this resolver must be callable from a fiber that never
 * injected `skills`.
 */
export interface HandoffGuidanceRuntime {
  skills?: SkillRegistryLike
  /**
   * Reads a guidance markdown file. Injected so the resolver stays testable
   * and so a deployment without filesystem access can still use skill names.
   */
  readFile?: (path: string) => Promise<string>
  logger?: { warn?: (message: string) => void }
}

/**
 * Whether the configured value should be read from disk instead of the skill
 * registry. A DSH skill name is kebab-case and cannot contain a separator, a
 * dot, or a drive letter, so any of those means "this is a path".
 */
export function looksLikeGuidancePath(value: string): boolean {
  return value.includes('/')
    || value.includes('\\')
    || value.includes('.')
    || value.startsWith('~')
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
  runtime: HandoffGuidanceRuntime,
  config: Pick<VoiceConfig, 'handoffSkill' | 'handoffInstructions'>,
  options: HandoffGuidanceContext,
): Promise<HandoffGuidance> {
  const skillName = config.handoffSkill.trim()
  const inline = config.handoffInstructions.trim()
  const skillBody = skillName === '' ? undefined : await loadGuidanceBody(runtime, skillName, options)
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

async function loadGuidanceBody(
  runtime: HandoffGuidanceRuntime,
  configured: string,
  options: HandoffGuidanceContext,
): Promise<string | undefined> {
  if (looksLikeGuidancePath(configured)) return await loadGuidanceFile(runtime, configured)
  return await loadSkillBody(runtime, configured, options)
}

/** One guidance file, with YAML frontmatter removed: only prose reaches the Agent. */
async function loadGuidanceFile(
  runtime: HandoffGuidanceRuntime,
  path: string,
): Promise<string | undefined> {
  const readFile = runtime.readFile
  if (readFile === undefined) {
    runtime.logger?.warn?.(`[realtime-voice] handoff guidance file "${path}" is configured but file reading is unavailable`)
    return undefined
  }
  try {
    const raw = await readFile(expandHome(path))
    const body = stripFrontmatter(raw).trim()
    if (body === '') {
      runtime.logger?.warn?.(`[realtime-voice] handoff guidance file "${path}" is empty`)
      return undefined
    }
    return body
  } catch (error) {
    runtime.logger?.warn?.(
      `[realtime-voice] failed to read handoff guidance file "${path}": ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}

function expandHome(path: string): string {
  if (!path.startsWith('~')) return path
  const home = process.env.HOME
  return home === undefined || home === '' ? path : `${home}${path.slice(1)}`
}

/** A leading `---` block is skill metadata, not instructions. */
function stripFrontmatter(value: string): string {
  if (!value.startsWith('---')) return value
  const end = value.indexOf('\n---', 3)
  if (end === -1) return value
  const after = value.indexOf('\n', end + 1)
  return after === -1 ? '' : value.slice(after + 1)
}

async function loadSkillBody(
  runtime: HandoffGuidanceRuntime,
  skillName: string,
  options: HandoffGuidanceContext,
): Promise<string | undefined> {
  try {
    const skills = runtime.skills
    if (skills === undefined) {
      runtime.logger?.warn?.(`[realtime-voice] handoff skill "${skillName}" is configured but the skills service is unavailable`)
      return undefined
    }
    const skill = await skills.get(skillName, {
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    })
    if (skill === undefined) {
      runtime.logger?.warn?.(`[realtime-voice] handoff skill "${skillName}" was not found`)
      return undefined
    }
    return typeof skill.content === 'string' && skill.content.trim() !== '' ? skill.content : undefined
  } catch (error) {
    runtime.logger?.warn?.(
      `[realtime-voice] failed to load handoff skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}
