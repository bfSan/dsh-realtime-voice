# 语音总管（无感入口 + 可创建管家 + 三层指导）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把语音入口从「文字菜单 + 表单」改成「点一下即通话」，并引入可任意创建、各自记住负责范围与跟进事项的语音总管。

**Architecture:** 新增一个 storage domain `realtime_voice_butlers` 保存管家注册表；通话按 `voice-supervisor:<butlerId>` 租赁，Host 在 `voice.ready` 时把当前管家的身份、范围与跟进摘要注入实时模型；Skill 拆成内置底座、per-butler 沟通人格、现有执行汇报三层；UI 把右下角入口换成拨号球 + 长按面板。

**Tech Stack:** TypeScript、React 18（`renderToStaticMarkup` + jsdom 测试）、Vitest 4、`@deepseek-ai/dsh-storage-domain` 的 `defineDomain` + Zod、Cordis、DSH 0.1.5-rc.2。

**Spec:** `docs/superpowers/specs/2026-09-21-voice-butler-design.md`

## Global Constraints

- 仓库：`/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice`；分支 `feat/dsh-0.1.5-compat` 与 `feat/voice-supervisor`（后者被 worktree `/private/tmp/dsh-voice-supervisor-20260921` 占用，只能用 `git -C /private/tmp/dsh-voice-supervisor-20260921 merge --ff-only <sha>` 同步，不能 `git branch -f`）。
- 所有 domain 名必须匹配 `^[a-z][a-z0-9_]*$`（`realtime_voice_inbox`、`realtime_voice_butlers`），必须用 `defineDomain`，schema 必须是 Zod 且 `safeParse(null).success === false`。
- 每个任务结束必须跑：`pnpm test`、`pnpm build`、最后一项跑 `pnpm verify` 与 `git diff --check`。现有 255 项测试不得回归（任务 5 起基线会上涨，按当时数字断言）。
- 不写 API Key、不读凭据明文、不改 DSH 源码、不改用户真实项目。
- 第一期：不绑定任何全局快捷键（只留可配置字段）；per-butler 的 `voice`、`stylePrompt`、`preferences` 只保留字段，不提供 UI、不写入、不读取，一律回落全局。
- 测试风格沿用仓库现状：纯函数单测 + `renderToStaticMarkup` 断言 HTML；TDD 先写失败测试。

## File Structure

- `src/host/butler-registry.ts`（新建）：管家注册表的纯逻辑（创建、重命名、查、删除、跟进任务与范围读写、注入文本生成）。不碰 Cordis、不碰存储后端，便于单测。
- `src/host/butler-persistence.ts`（新建）：`realtime_voice_butlers` 的 `defineDomain` 声明与 Zod schema。
- `src/index.ts`（修改）：打开该 domain，加载注册表，注入 Host。
- `src/host/voice-supervisor.ts`（修改）：持有 `butlerId`，路由与记忆更新。
- `src/host/voice-connection.ts`（修改）：hello 带 butlerId；租赁 key；注入文本；新工具。
- `src/supervisor-protocol.ts`（修改）：新工具定义与参数校验。
- `src/host/supervisor-guidance.ts`（修改）：三层拼装与无项目时的 Skill 解析。
- `src/client/VoiceLauncher.tsx`（修改）：拨号球 + 长按面板。
- `src/client/controller.ts`（修改）：新增 `startSupervisor(butlerId?)`、`createButler(name)`。
- `src/client/voice.module.css`（修改）：拨号球与面板样式。

---

### Task 1: 管家注册表的纯逻辑与持久化声明

**Files:**
- Create: `src/host/butler-registry.ts`
- Create: `src/host/butler-persistence.ts`
- Test: `tests/butler-registry.spec.ts`

**Interfaces:**
- Produces: `interface VoiceButler { id: string; name: string; createdAt: number; lastUsedAt: number; scope: ButlerScope; memory: ButlerMemory }`；`interface ButlerScope { projects?: string[]; keywords?: string[]; defaultAgentPresetId?: string }`；`interface ButlerMemory { tasks: ButlerTaskRef[]; notes: string[] }`；`interface ButlerTaskRef { sessionId: string; title: string; projectId?: string; presetId?: string; lastTouchedAt: number; lastSummary: string }`
- Produces: `class ButlerRegistry`，方法 `create(name: string): VoiceButler`、`rename(id, name): VoiceButler`、`get(id): VoiceButler | undefined`、`list(): readonly VoiceButler[]`、`remove(id): boolean`、`setDefault(id)`、`defaultId(): string`、`touch(id, task: ButlerTaskRef)`、`setScope(id, scope: ButlerScope)`、`addNote(id, note: string)`、`snapshot(): StoredButlers`、`restore(stored: StoredButlers)`。
- Produces: `buildButlerBriefing(butler: VoiceButler): string`。
- Produces（butler-persistence.ts）: `export const butlerStorageSpec = defineDomain({ name: 'realtime_voice_butlers', version: 1, tables: {}, global: { schema: storedButlersSchema, initial: { schemaVersion: 1, butlers: [], defaultButlerId: undefined } } })`。

- [ ] **Step 1: 写失败测试**

```ts
import { expect, it } from 'vitest'
import { ButlerRegistry, buildButlerBriefing } from '../src/host/butler-registry.ts'
import { butlerStorageSpec } from '../src/host/butler-persistence.ts'

it('rejects null globals and invalid domain names', () => {
  expect(butlerStorageSpec.name).toBe('realtime_voice_butlers')
  expect(butlerStorageSpec.global.schema.safeParse(null).success).toBe(false)
  expect(butlerStorageSpec.global.schema.safeParse({ schemaVersion: 1, butlers: [] }).success).toBe(true)
})

it('creates butlers, keeps the first as default and remembers one task per butler', () => {
  const registry = new ButlerRegistry()
  const a = registry.create('运维')
  const b = registry.create('写作')
  expect(registry.defaultId()).toBe(a.id)
  registry.touch(a.id, { sessionId: 's1', title: '清理日志', lastTouchedAt: 1, lastSummary: '已删除 3 个旧日志' })
  registry.touch(b.id, { sessionId: 's2', title: '写周报', lastTouchedAt: 2, lastSummary: '已写完初稿' })
  expect(registry.get(a.id)?.memory.tasks.map(row => row.sessionId)).toEqual(['s1'])
  expect(registry.get(b.id)?.memory.tasks.map(row => row.sessionId)).toEqual(['s2'])
})

it('keeps briefings separate and free of other butlers', () => {
  const registry = new ButlerRegistry()
  const a = registry.create('运维')
  registry.touch(a.id, { sessionId: 's1', title: '清理日志', lastTouchedAt: 1, lastSummary: '已删除 3 个旧日志' })
  const b = registry.create('写作')
  const brief = buildButlerBriefing(registry.get(b.id)!)
  expect(brief).toContain('写作')
  expect(brief).not.toContain('清理日志')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/butler-registry.spec.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 最小实现**

`butler-registry.ts` 内：`id` 用 `name` 加序号的稳定 slug（`zh-CN` 名称直接保留汉字，只把空白与 `/` 折叠为 `-`）；`memory.tasks` 按 `lastTouchedAt` 倒序、上限 20、同 `sessionId` 覆盖更新；`notes` 上限 20；`snapshot()` 返回 `StoredButlers`；`restore()` 容忍缺失字段。

`buildButlerBriefing` 生成三行文本：身份行「你是用户指定的语音总管「{name}」。」、范围行（有 `scope.projects`/`keywords` 才输出「你负责的范围：…」，否则输出「你还没有固定负责范围，先用一句话确认本次要动的项目。」）、跟进行（有任务才输出「你上次跟进：{title} — {lastSummary}。」，否则「你上次没有跟进中的任务，先问清楚。」）。不输出任何绝对路径。

`butler-persistence.ts` 用 `z.unknown().transform()` 包住一个 `normalizeStoredButlers` 校验函数（写法照抄 `src/host/inbox-persistence.ts` 的 `storedInboxSchema`），未知结构抛错并 `context.addIssue`。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/butler-registry.spec.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/host/butler-registry.ts src/host/butler-persistence.ts tests/butler-registry.spec.ts
git commit -m "feat: add voice butler registry and storage domain"
```

### Task 2: Host 按管家持久化注册表并在通话中注入身份

**Files:**
- Modify: `src/index.ts:118-146`
- Modify: `src/host/voice-connection.ts:56,256-262,461-511`
- Test: `tests/host-lifecycle.spec.ts`

**Interfaces:**
- Consumes: Task 1 的 `ButlerRegistry`、`butlerStorageSpec`、`buildButlerBriefing`。
- Produces: `src/index.ts` 里 `directoryServices.butlers?: ButlerRegistry`，供 `VoiceConnection` 读取。

- [ ] **Step 1: 写失败测试**

在 `tests/host-lifecycle.spec.ts` 增加：注入 `storageDomain`（形如 `{ open: async () => ({ global: { get: () => ({ schemaVersion: 1, butlers: [] }), set: async () => {} }, close: async () => {} }) }`）并断言 `apply(context, config)` 后 `open` 被调用两次（inbox 与 butlers）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/host-lifecycle.spec.ts`
Expected: FAIL，`open` 只被调用一次。

- [ ] **Step 3: 最小实现**

在 `src/index.ts` 现有 `storageDomain` 注入块里并行打开第二个 domain：`const butlerDomain = await storage.open(butlerStorageSpec)`，用 `ButlerRegistry.restore(parsed)` 填充，并在 `ctx.inject(['storageDomain'])` 的 effect 里把 `close` 一并关闭；失败只 `ctx.logger.warn`，不影响通话。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/host-lifecycle.spec.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/host-lifecycle.spec.ts
git commit -m "feat: open the butler domain alongside the inbox"
```

### Task 3: 协议与租赁按管家区分，新增总管工具

**Files:**
- Modify: `src/supervisor-protocol.ts:6-44`
- Modify: `src/host/voice-connection.ts:56,256-262`
- Modify: `src/host/voice-supervisor.ts:12-34`
- Test: `tests/supervisor-protocol.spec.ts`

**Interfaces:**
- Produces: `SupervisorHello` 增加可选 `butlerId?: string`；`SUPERVISOR_TOOL_NAMES` 增加 `'list_voice_butlers'`、`'switch_voice_butler'`、`'remember_voice_scope'`、`'note_voice_todo'`；`parseSupervisorArguments` 对 `switch_voice_butler` 校验 `{ butlerId }`，对 `remember_voice_scope` 校验 `{ note }`，对 `note_voice_todo` 校验 `{ note }`。
- Produces: 租赁目标改为 `` `voice-supervisor:${butlerId ?? 'default'}` ``。

- [ ] **Step 1: 写失败测试**

```ts
import { expect, it } from 'vitest'
import { isSupervisorHello, parseSupervisorArguments, SUPERVISOR_TOOL_NAMES } from '../src/supervisor-protocol.ts'

it('carries the butler id and validates the new tools', () => {
  expect(isSupervisorHello({ protocol: 'dsh.voice.supervisor.v1', type: 'voice.hello', butlerId: 'b1' })).toBe(true)
  expect(SUPERVISOR_TOOL_NAMES).toContain('switch_voice_butler')
  expect(parseSupervisorArguments('switch_voice_butler', '{"butlerId":"b1"}')).toEqual({ butlerId: 'b1' })
  expect(() => parseSupervisorArguments('switch_voice_butler', '{"name":"x"}')).toThrow()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/supervisor-protocol.spec.ts`
Expected: FAIL。

- [ ] **Step 3: 最小实现**

`isSupervisorHello` 放宽校验只检查 `protocol`/`type`，`butlerId` 存在时必须是 1-64 字符字符串。`voice-connection.ts` 里 `SUPERVISOR_LEASE_TARGET` 从常量改为按 hello 计算的变量，并在 `start()` 用它做 `target.sessionId`。`VoiceSupervisor` 构造参数增加 `butlerId: string`，保存为只读字段 `butlerId`。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/supervisor-protocol.spec.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/supervisor-protocol.ts src/host/voice-connection.ts src/host/voice-supervisor.ts tests/supervisor-protocol.spec.ts
git commit -m "feat: scope supervisor calls per butler"
```

### Task 4: 三层 Skill 拼装与注入

**Files:**
- Modify: `src/host/supervisor-guidance.ts:1-32`
- Modify: `src/host/voice-connection.ts:484-511`
- Test: `tests/supervisor-guidance.spec.ts`

**Interfaces:**
- Consumes: Task 1 的 `buildButlerBriefing(butler)`；现有 `resolveHandoffGuidance`、`DEFAULT_SUPERVISOR_GUIDANCE`。
- Produces: `resolveSupervisorGuidance(options, runtime)` 的 `options` 增加 `butlerBriefing: string`；返回值 `body` 顺序恒为 底座 → `DEFAULT_SUPERVISOR_GUIDANCE` → `butlerBriefing` → 用户 Skill/指令。

- [ ] **Step 1: 写失败测试**

```ts
import { expect, it } from 'vitest'
import { resolveSupervisorGuidance } from '../src/host/supervisor-guidance.ts'

it('keeps the base layer first and resolves a named skill without a project', async () => {
  const result = await resolveSupervisorGuidance(
    { skill: 'my-butler', instructions: '', butlerBriefing: '你是语音总管「运维」。' },
    { skills: { get: async () => ({ content: '说话简短' }) } },
  )
  expect(result.status).toBe('loaded')
  expect(result.body!.indexOf('不要念绝对路径')).toBeLessThan(result.body!.indexOf('my-butler'))
  expect(result.body).toContain('你是语音总管「运维」。')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/supervisor-guidance.spec.ts`
Expected: FAIL（`options.cwd` 缺失时 `status` 为 `error`）。

- [ ] **Step 3: 最小实现**

删掉 `supervisor-guidance.ts:21-23` 的「无 cwd 即 error」短路，改为照常调用 `resolveHandoffGuidance`；把 `DEFAULT_SUPERVISOR_GUIDANCE` 前面再加一段 `SUPERVISOR_BASE_GUIDANCE`（不念绝对路径与技术清单、一次最多两句、先给结论或问题、不重复汇报、改动前必须口头确认）；`butlerBriefing` 紧随默认规则之后。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/supervisor-guidance.spec.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/host/supervisor-guidance.ts src/host/voice-connection.ts tests/supervisor-guidance.spec.ts
git commit -m "feat: layer butler guidance over a fixed base"
```

### Task 5: 浏览器拨号球与长按面板

**Files:**
- Modify: `src/client/VoiceLauncher.tsx:20-82`
- Modify: `src/client/controller.ts:91-104`
- Modify: `src/client/index.ts:68-78`
- Modify: `src/client/voice.module.css:1095-1140`
- Test: `tests/voice-launcher.spec.tsx`

**Interfaces:**
- Consumes: `VoiceCallController.startSupervisor(butlerId?: string)`、`createButler(name: string): Promise<string>`、`listButlers(): readonly { id: string; name: string }[]`。
- Produces: 拨号球 `<button aria-label="打给语音总管">`，单击即 `startSupervisor()`；长按 500ms 或右键打开面板，面板含已有总管列表与「新安排一位总管」输入框。

- [ ] **Step 1: 写失败测试**

```tsx
it('dials on a single click and offers butler choice only on long press', async () => {
  // 渲染后：container.querySelector('[aria-label="打给语音总管"]') 存在
  // 单击后 startSupervisor 被调用一次，createButler 未调用
  // 长按后列表出现「新安排一位总管」
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/voice-launcher.spec.tsx`
Expected: FAIL。

- [ ] **Step 3: 最小实现**

拨号球用现有 `.iconButton` 尺寸（34px 圆形）并加 `.dialBall` 脉冲样式；`onPointerDown` 起 500ms 计时器，触发即 `setOpen(true)`，在 `onPointerUp`/`onPointerCancel` 清除；计时器触发过则抑制随后的 `click`；`onContextMenu` 直接 `setOpen(true)` 并 `preventDefault`。面板复用现有 `VOICE_DIRECTORY_ROUTE` 的任务列表，但把「拨打电话」按钮去掉（单击球已经拨号），保留选择已有任务与新建任务。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/voice-launcher.spec.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/client/VoiceLauncher.tsx src/client/controller.ts src/client/index.ts src/client/voice.module.css tests/voice-launcher.spec.tsx
git commit -m "feat: replace the launcher menu with a dial ball"
```

### Task 6: 收尾验证与发布

**Files:**
- Modify: `docs/testing/voice-supervisor-acceptance.md`
- Modify: `package.json`、`src/protocol.ts`（版本号）

- [ ] **Step 1: 更新验收记录**

在 `alpha` 自动回归段落补：拨号球单击即拨、管家注册表持久化、三层指导顺序。把 `pnpm test` 的测试数字改成当时实际值。

- [ ] **Step 2: 全量验证**

Run: `pnpm test && pnpm build && pnpm verify && git diff --check`
Expected: 全绿，无 whitespace 错误。

- [ ] **Step 3: 升版本并提交**

`package.json` 与 `src/protocol.ts` 的 `VOICE_WEB_CLIENT_VERSION` 一起改为 `0.1.0-alpha.23`，提交。

- [ ] **Step 4: 同步两个分支并打标签**

```bash
git tag -a v0.1.0-alpha.23 -m "v0.1.0-alpha.23"
git -C /private/tmp/dsh-voice-supervisor-20260921 merge --ff-only <sha>
git push origin feat/dsh-0.1.5-compat feat/voice-supervisor v0.1.0-alpha.23
```

- [ ] **Step 5: 重启 DSH Desktop 确认无插件报错**

Check: `tail -60 "$HOME/Library/Application Support/DSH Desktop/logs/host/dsh-$(date +%F).log"` 无 `realtime voice inbox storage initialization failed` 与新增 butler 域报错。人工验收项（麦克风、听感、真实回拨）保持 NOT TESTED。
