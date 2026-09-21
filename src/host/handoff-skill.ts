/**
 * The plugin's built-in reporting/planning skill. It gives a fresh install a
 * usable default, and it doubles as a worked example of the shape an operator
 * can drop into a project `.dsh/skills` root under the same name.
 *
 * Registration is best-effort: the skills service is optional at the Cordis
 * boundary, and a registry that refuses the entry must never keep the voice
 * route from mounting.
 */

import { DEFAULT_HANDOFF_SKILL_NAME } from '../models.ts'

export { DEFAULT_HANDOFF_SKILL_NAME }

export const DEFAULT_HANDOFF_SKILL_DESCRIPTION =
  '语音总管汇报与规划规范：如何向语音用户汇报进展、先检查什么、怎么拆解工作。'

export const DEFAULT_HANDOFF_SKILL_CONTENT = `# 语音总管汇报与规划规范

你正在通过实时语音与用户对话。用户用耳朵接收信息，听不清长列表，也无法回看屏幕。

## 先做的事

1. 动手前先确认目标、范围和边界；不清楚就问一个最小问题，不要猜。
2. 先看与任务直接相关的文件、配置和当前状态，再决定改动点。
3. 涉及多步骤时，先在心里排出顺序，不要边做边改方向。
4. 改动前确认工作目录，只动任务需要的文件。

## 汇报什么

只在下列时刻开口：

- 需要用户做决定、授权或提供缺失信息；
- 发生了会改变结论的意外，比如文件不存在、权限不足、方案不可行；
- 长任务已经跑了一段时间且确实有关键节点完成；
- 任务结束，给出最终结论。

不要汇报这些：读了一个文件、跑了一条命令、开始某一步、中间产物生成、你自己能修的小报错。

## 怎么说

1. 第一句就是结论或问题，不要铺垫过程。
2. 一次最多两句，一行一个意思，不要念表格、路径清单和代码。
3. 先说"要不要你做什么"；不需要用户动作时明确说"你不用管"。
4. 数字和文件名只在影响用户决策时才说，并且用口语，不念全路径。
5. 像打电话一样说话。不要念标点、括号、引号、星号、编号或下划线，它们只是停顿；
   把书面语换成口语，例如"尚未完成"说成"还没弄好"，"进行查看"说成"我看看"。
6. 任务完成时按这个顺序说：做完了什么 → 结果在哪 → 有什么风险或没做的 → 下一步建议。

## 不要做的事

- 不要把同一件事汇报两次。
- 不要在用户还没问完时抢答长篇解释。
- 不要用"正在处理中"这类没有信息量的话填空。
- 不要代替用户决定需要授权的操作。
`

export interface HandoffSkillDefinition {
  name: string
  description: string
  content: string
  /**
   * Required by the registry's load-time revalidation. `ctx.skills.register()`
   * defaults only `invocation` and `provider`, so omitting this registers
   * cleanly and then throws "loaded skill ... source must be a string" the
   * first time a handoff tries to read the body.
   */
  source: string
  whenToUse?: string
}

export interface HandoffSkillRegistryLike {
  register(skill: HandoffSkillDefinition): () => void
}

export interface DefaultHandoffSkillOptions {
  name?: string
  content?: string
}

export function defaultHandoffSkill(options: DefaultHandoffSkillOptions = {}): HandoffSkillDefinition {
  return {
    name: options.name ?? DEFAULT_HANDOFF_SKILL_NAME,
    description: DEFAULT_HANDOFF_SKILL_DESCRIPTION,
    content: options.content ?? DEFAULT_HANDOFF_SKILL_CONTENT,
    // Matches the registry's own `RUNTIME_PROVIDER`, i.e. the label it would
    // have applied itself if `register()` defaulted this field.
    source: 'runtime',
    whenToUse: '在执行 Agent 通过实时语音向用户汇报进展、提问或交付结果时使用。',
  }
}

/**
 * Register the built-in skill when the skills service is present.
 *
 * @returns the registry disposer, or undefined when registration was skipped.
 */
export function registerDefaultHandoffSkill(
  runtime: { skills?: HandoffSkillRegistryLike; logger?: { warn?: (message: string) => void } },
): (() => void) | undefined {
  try {
    const skills = runtime.skills
    if (skills === undefined) return undefined
    return skills.register(defaultHandoffSkill())
  } catch (error) {
    runtime.logger?.warn?.(
      `[realtime-voice] built-in handoff skill could not be registered: ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}
