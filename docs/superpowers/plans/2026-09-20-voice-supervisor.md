# 独立语音总管 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 不默认派发子代理；需要并行代理时由用户选择。

**Goal:** 修复现有回拨交互与播放生命周期，并实现不依赖聊天框、能明确选择执行对象和查询结果的语音总管。

**Architecture:** 先稳定已有通话链路，再增加独立任务目录和显式任务路由。语音连接管理交流与播放，DSH 原生会话管理执行；两套指导配置分别服务语音总管与执行 Agent。媒体链路不整体重写。

**Tech Stack:** TypeScript、React 18、Cordis 4.0.2、DSH 0.1.5-rc.2、Vitest、现有 ws 与 Web Audio；真实 DSH Desktop 验收。

**Spec:** `docs/superpowers/specs/2026-09-20-voice-supervisor-design.md`

## Global Constraints

- 基线：v0.1.0-alpha.18，DSH 0.1.5-rc.2。
- 本轮仅修改语音插件；保留现有聊天框拨号入口和凭据管理。
- 不修改 DSH 源码、真实项目或模型凭据。
- 不扩展 ChatGPT 跨应用执行桥，不承诺应用退出后的系统来电。
- 旧直连客户端继续原有绑定行为；独立通话采用显式能力协商。
- Agent 指 DSH 已配置的 preset；已有任务不隐式更换模型或权限。
- 默认不记录音频、Key、完整提示词或用户正文。
- 自动化通过、桌面交互通过、人工听感通过分别记录。
- 本文是实施计划，不表示功能已完成。所有任务初始未勾选。

## 执行环境与阶段门

仓库：`/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice`。
本地 desktop profile 用 link 指向该仓库，直接构建会改变下次加载的插件。执行时先用 using-git-worktrees 创建隔离工作树，在隔离树内安装锁定依赖及构建；不要在未验证时覆盖正在使用的 lib。

阶段 A：任务 1—4，交付可单独运行的回拨修复。
阶段 B：任务 5—8，依赖阶段 A 的播放记录，交付独立总管。
任务 9：整体验收、发布和安装。

每项任务完成后只提交该项文件；失败时先定位，不继续叠加下一项。每阶段都运行 `pnpm test`、`pnpm build`、`pnpm verify`。只在用户授权的安全测试 workspace 产生执行任务。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `src/host/voice-diagnostics.ts`（新） | 有界、无正文的事件关联记录 |
| `src/host/report-delivery.ts`（新） | 汇报投递、响应结束、播放排空与中断状态 |
| `src/host/voice-inbox.ts` | 回拨条目、稍后/已读状态及待回答交互 |
| `src/host/inbox-persistence.ts`（新） | DSH 存储适配和恢复校验 |
| `src/client/CallBackList.tsx`（新） | 从 Overlay 提取列表、确认框和操作反馈 |
| `src/host/voice-task-directory.ts`（新） | 项目、preset、任务、权威结果读取及创建 |
| `src/host/voice-supervisor.ts`（新） | 显式任务路由、工具调用与跨任务交互关联 |
| `src/supervisor-protocol.ts`（新） | 独立通话协议与工具参数校验 |
| `src/client/VoiceLauncher.tsx`（新） | 全局电话入口与项目/Agent/任务选择 |
| `src/host/supervisor-guidance.ts`（新） | 语音总管指导解析与默认规则 |
| 现有连接、bootstrap、controller、配置文件 | 仅增加上述模块的接线，保留旧协议 |

## Task 1：确定接听停播的事件顺序

**Files:** 新建 `src/host/voice-diagnostics.ts`、`tests/voice-diagnostics.spec.ts`；修改 `src/host/dashscope-realtime.ts`、`src/host/voice-connection.ts`、`src/client/controller.ts`。

**Interfaces:** 新增 `recordVoiceEvent(event: VoiceDiagnosticEvent): void`。事件仅含 `callId`、可选 `reportId/responseId/requestId`、`at`、`kind`、可选 `source`；kind 限定 accept、ready、inject、response-start、response-end、cancel、drained、error。source 限定 local-vad、server-vad、user、transport。

- [ ] 在隔离树中确认 baseline 测试与构建，记录命令退出码；核对 desktop profile 的 link 目标，避免误装。
- [ ] 写失败测试，诊断事件不能透出额外正文或凭据字段：

```ts
it('keeps diagnostic records free of payloads', () => {
  const lines: string[] = []
  const record = createVoiceDiagnostics(line => lines.push(line))
  record({ callId: 'c1', at: 1, kind: 'cancel', source: 'local-vad',
    audio: 'fixture-audio', apiKey: 'fixture-key' } as never)
  expect(lines.join('')).not.toMatch(/fixture-audio|fixture-key/)
})
```

- [ ] 运行 `pnpm exec vitest run tests/voice-diagnostics.spec.ts`，确认失败来自缺失实现。
- [ ] 实现字段白名单序列化；`createVoiceDiagnostics(write)` 返回上述 record 函数。接线到取消请求、provider response、汇报投递和播放 ACK；仅启用诊断时输出。
- [ ] 跑测试确认通过；在测试实例复现一次“接听但不讲话”，采集关联事件，区分误触发 VAD、取消竞态、连接失败、未投递。将真实顺序和尚未证明的部分记入 `docs/testing/voice-supervisor-acceptance.md`。
- [ ] 提交 `test: trace callback playback lifecycle without sensitive payloads`。没有复现证据时不得把停播标记为已修复。

## Task 2：取消响应竞态与播放完成确认

**Files:** 新建 `src/host/report-delivery.ts`、`tests/report-delivery.spec.ts`；修改 `src/host/dashscope-realtime.ts`、`src/host/voice-connection.ts`、`src/protocol.ts`、`tests/dashscope-realtime.spec.ts`、`tests/voice-audio-flow.spec.ts`。

**Interfaces:** `ReportDelivery.begin(reportId, attemptId)`；`attachResponse(attemptId,responseId)`；`responseEnded(attemptId)`；`playbackDrained(attemptId)`；`interrupt(attemptId)`；`state(reportId)`。状态为 queued、playing、interrupted、completed、failed。每次显式重听生成新 attemptId。

- [ ] 写失败测试，只有双重确认才完成，迟到 ACK 不得完成被打断的 attempt：

```ts
it('does not mark interrupted speech as delivered', () => {
  const delivery = new ReportDelivery()
  delivery.begin('r1', 'a1')
  delivery.attachResponse('a1', 'response1')
  delivery.responseEnded('a1')
  expect(delivery.state('r1')).not.toBe('completed')
  delivery.interrupt('a1')
  delivery.playbackDrained('a1')
  expect(delivery.state('r1')).toBe('interrupted')
})
```

- [ ] 运行 `pnpm exec vitest run tests/report-delivery.spec.ts tests/dashscope-realtime.spec.ts` 确认 RED。
- [ ] 实现状态转换；替换 deliverInboxEntries 中提前 markDelivered 的逻辑。在 response 创建时关联 announcement/attempt，在对应 stream 排空后确认完成。无音频响应记为未播放，旧客户端无 ACK 时不声称“已听完”。
- [ ] 在 provider 层跟踪本插件发起的取消请求：没有活动响应时不发送；关联的 no-active-response 错误结算为取消已失效，不关闭通话。无法关联的错误保留诊断；鉴权/连接错误仍失败。按任务 1 的真实时序补回归，不能无条件吞所有错误。
- [ ] 测试正常完成、response/end 与 drained 顺序互换、重复 ACK、取消迟到、重连旧 ACK、真实插话和显式重听。运行相关测试及 build。
- [ ] 提交 `fix: acknowledge callback reports only after playback completes`。

## Task 3：列表反馈、二次确认与布局

**Files:** 新建 `src/client/CallBackList.tsx`、`tests/callback-list.spec.tsx`；修改 `src/client/VoiceOverlay.tsx`、`src/client/controller.ts`、`src/client/voice.module.css`、`tests/voice-overlay-interaction.spec.tsx`；新建 `tests/client-inbox-actions.spec.ts`。

**Interfaces:** `dismissInbox(ids): Promise<void>` 必须等待 HTTP 成功；客户端行状态为 idle、connecting、snoozed、error。确认框持有候选 ids，只有确认时调用 dismiss。

- [ ] 写失败测试：取消确认不调用 dismiss；DELETE 失败不移除条目；重复接听只建立一次连接。使用现有 mountOverlay fixture，扩展真实 controller + mock fetch：

```ts
it('keeps reports when dismiss fails', async () => {
  const view = createInboxControllerFixture({ deleteStatus: 500 })
  await view.controller.dismissInbox(['r1'])
  expect(view.controller.getSnapshot().inbox.map(x => x.id)).toContain('r1')
  expect(view.controller.getSnapshot().error).toBeTruthy()
})
```

`createInboxControllerFixture` 放在该测试文件，构造现有 VoiceCallController，以 mock GET 返回 r1、mock DELETE 返回指定状态，通过 startPresence 的首次轮询填充，不访问内部私有字段。

- [ ] 运行 `pnpm exec vitest run tests/client-inbox-actions.spec.ts tests/callback-list.spec.tsx`，确认 RED。
- [ ] 提取现有列表 JSX；确认框文案为“标记已读后将从待汇报列表移除，DSH 会话不会删除”。待回答项额外说明交还文字界面。实现响应状态检查、失败提示、正在连接反馈和已稍后标记。
- [ ] 使用固定选择列与可收缩标题列：

```css
.incomingLabel { display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; }
.rowCheck { width: 18px; min-width: 18px; height: 18px; padding: 0; }
.incomingTitle { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.incomingActions { display: flex; flex-wrap: wrap; align-items: center; }
```

- [ ] 跑测试；真实桌面验证 360/600/1200 像素可用宽度、超长中文标题、收起后挂断、鼠标和键盘。记录 checkbox 与标题矩形及截图，不能仅检查 CSS 文本。
- [ ] 提交 `fix: make callback actions observable and confirm dismissal`。

## Task 4：回拨恢复与终态去重

**Files:** 新建 `src/host/inbox-persistence.ts`、`tests/inbox-persistence.spec.ts`；修改 `src/host/voice-inbox.ts`、`src/host/progress-coalescer.ts`、`src/index.ts`、相关已有测试。

**Interfaces:** `InboxPersistence.load(): Promise<StoredInbox>`、`save(snapshot: StoredInbox): Promise<void>`；StoredInbox 含 schemaVersion:1 和 entries，entry 使用任务/session/turn/interaction 稳定键及 Task 2 的交付状态。DSH 存储实例通过注入提供，不手写 ~/.dsh 路径。

- [ ] 写失败测试：同一 turn 的实时终态和历史回填只生成一条；重启保留 completed，playing 恢复为待接听；旧 interaction 不自动批准。

```ts
it('restores unfinished playback without replaying completed reports', () => {
  const entries = restoreReportStates([
    { id: 'r1', delivery: 'playing' },
    { id: 'r2', delivery: 'completed' },
  ])
  expect(entries.map(x => x.delivery)).toEqual(['queued', 'completed'])
})
```

- [ ] 运行 `pnpm exec vitest run tests/inbox-persistence.spec.ts tests/voice-inbox.spec.ts tests/progress-coalescer.spec.ts`。
- [ ] 实现 `restoreReportStates` 和串行写入，拒绝未知 schema、不覆写损坏快照；向 UI 显示恢复错误。已读、稍后、交付完成均保存；未确认完成不提前去重。超过上限先清理已完成条目；不能静默丢掉有效待回答项，容量不足时交还浏览器。
- [ ] 清理、取消和插件卸载必须释放 held interaction；恢复时向 DSH 核验交互仍有效，无法核验则显示“请在原任务继续”，不重建有效批准。
- [ ] 验证 10 秒响铃跨轮询不提前结束、接听/稍后停铃；完成阶段 A 全量验证后提交 `fix: persist callback state and reconcile terminal reports`。

## Task 5：权威任务目录与结果读取

**Files:** 新建 `src/host/voice-task-directory.ts`、`tests/voice-task-directory.spec.ts`；修改 `src/host/dsh-runtime-compat.ts`、`src/index.ts`。

**Interfaces:** 定义 `TaskRef = { taskId:string; sessionId:string; workspace:string; presetId:string }`；本轮 taskId 使用 DSH sessionId，turn 单独标识。`VoiceTaskDirectory` 提供 `listProjects()`、`listAgents()`、`listTasks()`、`readResult(taskId)`、`createTask({workspace,presetId,requestId})`。

- [ ] 核对本地 DSH workspace、preset、storage 声明及 `SessionCreateRequest`；把适配调用写成类型检查的 contract test。目录能力缺失明确返回 unavailable，不虚构列表或默认路径。
- [ ] 写失败测试，空闲不等于没有工作成果，查询不触发 create/prompt：

```ts
it('reads a finished result without starting execution', async () => {
  const host = createDirectoryFixture({ running: false, finalText: '已完成核对' })
  const result = await host.directory.readResult('s1')
  expect(result).toMatchObject({ state: 'completed', text: '已完成核对' })
  expect(host.create).not.toHaveBeenCalled()
  expect(host.prompt).not.toHaveBeenCalled()
})
```

fixture 在该测试内注入 list/page/create spies；page 返回现有 session/event 格式的 assistant/message 和 turn/end，不复制真实用户日志。

- [ ] 运行 `pnpm exec vitest run tests/voice-task-directory.spec.ts` 确认 RED。
- [ ] 从 DSH 控制器读取目录；readResult 返回 sessionId、turn、seq、状态和来源，不把任意最后一条进度当终态。新建必须明确 workspace/preset，以 requestId 对创建幂等；原生接口不支持请求键时映射稳定 sessionId。
- [ ] 测试不存在任务、失效 preset、目录读取失败、任务正在运行但已有历史结果、重复创建；提交 `feat: expose authoritative voice task directory`。

## Task 6：独立协议与显式路由

**Files:** 新建 `src/supervisor-protocol.ts`、`src/host/voice-supervisor.ts`、`tests/voice-supervisor.spec.ts`、`tests/supervisor-protocol.spec.ts`；修改 `src/host/voice-connection.ts`、`src/host/voice-runtime.ts`、`src/host/voice-bootstrap.ts`、`src/index.ts`。

**Interfaces:** 新协议 `dsh.voice.supervisor.v1`，独立 hello 不要求 sessionId。工具名 list_voice_projects、list_voice_agents、list_voice_tasks、read_voice_task_result、select_voice_task、create_voice_task、submit_voice_task、cancel_voice_task。复用 answer_dsh_question/approval 并核验交互归属。旧 VOICE_PROTOCOL 不改必填目标。

- [ ] 写失败测试：没有目标时拒绝副作用；新用户轮次才能追加工作；只查询结果不会创建或修改文件：

```ts
it('requires an explicit target for execution', async () => {
  const view = createSupervisorFixture()
  const result = await view.supervisor.submit({
    userTurnId: 'u1', instruction: '核对结果', spokenInput: '核对结果',
  })
  expect(result.status).toBe('needs-selection')
  expect(view.prompt).not.toHaveBeenCalled()
})
```

`VoiceSupervisor.submit` 输入含可选 taskId、userTurnId、instruction、spokenInput；输出 status 为 accepted、needs-selection、needs-clarification、failed。fixture 注入 Task 5 的目录和现有 coordinator factory。

- [ ] 运行 `pnpm exec vitest run tests/voice-supervisor.spec.ts tests/supervisor-protocol.spec.ts` 确认 RED。
- [ ] 实现按 TaskRef 选择 coordinator；无目标不自动回退当前页面。submit 按任务运行状态 queue/steer；幂等键包含 callId、userTurnId、taskId、规范化意图，冲突返回澄清，不合并跨任务请求。
- [ ] 工具参数执行运行时校验，用户轮次由宿主转写事件生成，不让模型自造。read_result/接听阶段仅暴露查询及交互回答工具；收到新用户执行请求后才进入执行澄清流程。不能承诺任意自然语言语义可被字符串规则完全验证。
- [ ] 对多任务审批、同时完成、目标切换、重新连接、同轮重复调用写回归；旧 Web/Direct 协议测试必须全过。
- [ ] 提交 `feat: route independent voice calls to explicit tasks`。

## Task 7：全局电话入口

**Files:** 新建 `src/client/VoiceLauncher.tsx`、`tests/voice-launcher.spec.tsx`；修改 `src/client/index.ts`、`src/client/controller.ts`、`src/client/VoiceOverlay.tsx`、`src/client/voice.module.css`。

**Interfaces:** controller 新增 `startSupervisor(): Promise<void>`、`selectTask(taskId): Promise<void>`；保留 `start(sessionId)`。Launcher 从宿主目录读取项目、preset、任务，通过新协议发送选择，不能直接修改执行会话。

- [ ] 写失败测试，无当前会话仍能拨号，打开其它聊天不改变选择：

```ts
it('can call without an open conversation', () => {
  const view = renderLauncher({ currentSession: undefined })
  view.clickCall()
  expect(view.startSupervisor).toHaveBeenCalledOnce()
  expect(view.createTask).not.toHaveBeenCalled()
})
```

renderLauncher 在测试内用 react-dom createRoot + act，注入 hook 快照与 spies，沿用 overlay 测试模式。

- [ ] 运行 `pnpm exec vitest run tests/voice-launcher.spec.tsx` 确认 RED。
- [ ] 在现有 shell.overlay 插槽挂载常驻全局入口，避免依赖未经核对的新插槽。采用菜单/选择器展示目录、搜索任务、当前执行对象、加载与空列表错误。拨号只建立语音连接，选择或明确新任务后才创建执行记录。
- [ ] host 返回 busy/unavailable 时明确反馈；关闭窗口与结束电话区分；保留现有聊天框按钮，作为带候选任务的快捷入口。
- [ ] 真实桌面测试空白页面拨号、菜单键盘操作、多个项目/Agent、窄屏和长标题；提交 `feat: add global voice launcher and task selection`。

## Task 8：两套指导与意图澄清

**Files:** 新建 `src/host/supervisor-guidance.ts`、`tests/supervisor-guidance.spec.ts`；修改 `src/host/voice-bootstrap.ts`、`src/host/config.ts`、`src/models.ts`、`src/client/model-settings.ts`、`src/client/VoiceSettingsCard.tsx`、`src/host/handoff-guidance.ts`、`tests/model-settings.spec.ts`。

**Interfaces:** 新配置 `supervisorSkill:string`、`supervisorInstructions:string`；保留 handoffSkill/handoffInstructions。`resolveSupervisorGuidance({skill, instructions, cwd}, runtime)` 返回 `{body, source, status:'default'|'loaded'|'error', error?}`。

- [ ] 写失败测试，空项目不解析项目 Skill，配置失败可见，执行 Skill 不串入语音：

```ts
it('keeps configured voice guidance failures visible', async () => {
  const result = await resolveSupervisorGuidance(
    { skill: '/missing/voice.md', instructions: '' },
    { readFile: async () => { throw new Error('ENOENT') } },
  )
  expect(result.status).toBe('error')
  expect(result.body).toContain('先确认汇报对象')
})
```

- [ ] 运行 `pnpm exec vitest run tests/supervisor-guidance.spec.ts tests/model-settings.spec.ts` 确认 RED。
- [ ] 默认规则明确：先确认汇报对象；区分口头汇报、撰写、修改；“空闲”仅是运行状态；结果必须带工具依据；含糊指代先问一句，不猜文件操作。只加载文本，不执行 Skill 中的程序。
- [ ] 配置支持已选择项目的 DSH Skill 名或显式文件路径；沿用现有解析模式、大小限制和 frontmatter 处理。项目变更时重新加载并通过供应端已支持的 session update 更新 instructions，不主动创建语音响应。
- [ ] UI 分开两组设置并显示加载状态。回放固定语句“汇报啊”“再写一个100字汇报”“把两份汇报合并”，分别断言查询/澄清/明确执行路径；真实模型测试单独记录，提示词包含检查不能充当语义测试。
- [ ] 提交 `feat: separate voice supervisor guidance from execution guidance`。

## Task 9：整体验收与发布

**Files:** 更新 `docs/testing/voice-supervisor-acceptance.md`、`README.md`、协议文档、`package.json`、客户端版本及构建产物。

- [ ] 在隔离树执行 `pnpm test`、`pnpm build`、`pnpm verify`、`git diff --check`，逐一确认退出码；核对全部修改范围与凭据边界。
- [ ] 在独立测试 workspace 走设计中的十条验收。无用户说话时完整汇报、插话、问答和多任务选择需真实麦克风验收；无法执行的条目标 NOT TESTED，不标 PASS。
- [ ] 对“汇报啊”做负向验收：不得修改/合并文件；对“已读”做取消与网络失败验收；检查二者均不删除 DSH 会话。
- [ ] 记录每项 PASS/PARTIAL/FAIL/NOT TESTED、版本、复现步骤、无敏感信息的日志和截图引用。尚未定位停播原因时停止发布“已修复”结论。
- [ ] 确认远端及本地版本，选择未占用发布号，更新 package/client version/README 后重新 build+verify。提交产物，推送分支；发布 tag 使用实际验证的提交。
- [ ] 按用户既有授权先提交推送，再把验证后的提交安装到本地 link 对应仓库；不覆盖其它未提交改动。确认没有进行中的通话/任务后重启 DSH，检查实际版本、插件 UI 与新日志。
- [ ] 最终交付简明说明：版本、提交、入口位置、配置项、验证结果和剩余人工验收。保留 alpha.18 可回退版本，不回滚用户配置或任务数据。

## 自审映射

设计“可靠回拨”对应 1/2/4；“列表交互”对应 3；“目录与职责”对应 5/6；
“独立流程”对应 7；“两套指导”对应 8；“兼容、恢复、权限”对应 4/6/9。
不新增独立执行引擎，不使用 Skill 代替任务事实，不把三个自动化命令通过当作麦克风验收。
