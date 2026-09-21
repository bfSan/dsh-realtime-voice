# 语音总管：无感入口、可创建管家与三层指导

日期：2026-09-21
状态：方案已获用户认可；待用户审阅本规格后进入实施计划
基线：v0.1.0-alpha.22，DSH 0.1.5-rc.2，调用于 `/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice`

## 目标

让「打电话给总管」成为默认动作，而不是一次表单填写：用户点一下就通话，由某位已认识这位用户的**总管**接听；总管知道自己负责的范围与正在跟进的事项，能据此找到相关项目、会话和历史任务，用精简口语与用户确认需求，然后把执行交给 DSH Agent；只有在 Authorization、结论改变或任务终态时才主动回拨。

本轮只改语音插件。不修改 DSH 源码、用户真实项目或凭据存储。保留聊天框拨号入口与 write-only 凭据输入。

## 现状证据

- 入口是文字菜单而不是电话：`src/client/VoiceLauncher.tsx` 的「电话 · 语音总管」需先展开面板，再用下拉框选项目与 Agent 才能新建任务。认知负担全部落在拨号之前。
- 每次通话都是全新人格：`src/host/voice-supervisor.ts` 的 `VoiceSupervisor` 只持有 `selectedTask`，没有身份、没有跨通话记忆，无法「找到上次办事的那位」。
- 租赁目标写死为 `voice-supervisor`（`src/host/voice-connection.ts:56`），因此一次只能存在一条总管通话会话，无法承载多位管家。
- 沟通指导是单个配置字段（`src/host/supervisor-guidance.ts`），且名称型 Skill 在无项目时直接判定加载失败（`21-23` 行），全局人格无法生效。
- Skill 加载曾出现 `loaded skill source must be a string`（已在 alpha.17 修正），提示任何新增 Skill 必须自带 `source` 并通过注册表读回再校验。
- 回拨列表、振铃、播放排空 ACK、stability domain 持久化（`realtime_voice_inbox`）已可用，本设计复用它们，不重写。

## 方案取舍

1. **只改 UI 文案**：成本最低，但不能实现用户自选/新建管家与记忆，直接排除。
2. **无感入口 + 任意创建的多位管家 + 三层 Skill 指导**：采纳。一次做完身份模型，避免后续在协议与存储层做破坏性改动。
3. **另起一套语音执行 Agent**：第二套工具、上下文与权限体系，与 DSH 单一执行面冲突，不采纳。

## 用户流程

### 拨号

右下角常态只有一个圆形拨号球，不含文字标签。单击球即呼叫默认管家并接通；长按或右键才打开高级面板（选择已有总管、新建总管、查看/接管某个已有任务）；全局快捷键唤起同一动作，通话中再按一次即挂断。

通话中浮窗顶部显示当前管家称呼与状态；管家自报身份一句：「我是 XX，上次帮你做了 YY」。用户可随时口头切换：「换小李」「让上次那位接」「新开一个叫运维的总管」，对应的工具调用见下。挂断即结束通话，不影响 DSH 中正在运行的任务。

### 新总管

高级面板「新安排一位总管」只要求一个称呼，其余全部口头补齐。新总管的默认音色与实时模型继承全局配置，默认执行 Agent 为空（首次交接前口头确认），负责范围与跟进列表为空。

### 通话内容

顺序固定为：自报身份与上次事项 → 听用户诉求 → 在自己跟进的任务与负责范围内定位项目/会话 → 用精简口语复述确认（做什么、改哪些地方、什么算完成）→ 得到确认后才交接给 DSH Agent。模糊时问一个最小问题，不猜。技术路径、命令、文件清单不念，必要时说「第二份文档」而不是全路径。

## 数据模型

新增 stability domain `realtime_voice_butlers`，与 inbox 同法用 `defineDomain` + Zod schema 声明（domain 名必须匹配 `^[a-z][a-z0-9_]*$`）。单 global 槽，禁止 null：

```text
schemaVersion: 1
butlers: [{
  id, name, voice?, createdAt, lastUsedAt,
  scope: {projects?: string[], keywords?: string[], defaultAgentPresetId?: string},
  memory: {tasks: [{sessionId, title, projectId?, presetId?, lastTouchedAt, lastSummary}], notes: string[]},
}]
defaultButlerId
```

约束：`tasks` 上限 20 条按最近使用淘汰；`id` 稳定 slug；删除管家只删注册记录，不动其 DSH 会话。旧版本缺失字段按可选处理并走兼容版本，不新建第二个域。

每位管家的 `<realtime_delegation>` 注入自己的身份、负责范围、跟进任务摘要，以及用户偏好（表达粒度、是否念文件名）。会话史实始终以 DSH 为唯一权威记录；这里的 `memory` 只是索引与摘要。

## 协议增量

在现有 `dsh.voice.supervisor.v1` 上扩展，保留现有的 8 个工具。新增控制消息与工具：

- `voice.select-butler`（控制，替代现在的 `voice.select-task` 场景之一）：{ butlerId? }，缺省表示默认管家。
- `voice.create-butler`：{ name, requestId }，幂等，回放同一 requestId 不产生第二位。
- 工具 `list_voice_butlers`：列出称呼、负责范围摘要、最近跟进。
- 工具 `switch_voice_butler`：用户明确点名或要求换人时才调用；切换后必须重新自报身份。
- 工具 `remember_voice_scope` / `note_voice_todo`：写入范围与跟进事项，只写 `realtime_voice_butlers`，不影响任何执行会话。

租赁目标从固定 `voice-supervisor` 改为 `voice-supervisor:<butlerId>`，使不同管家的通话可被各自识别。一次仍只允许一通电话，其余拨号返回 busy。

## Skill 三层

1. **底座 Always-on**：插件内置、不可覆盖。约束包括不念绝对路径与技术清单、一次最多两句、先给结论或问题、不重复汇报同一件事、不替用户做授权决定、文件改动必须先得到口头确认。
2. **管家沟通人格 Per-butler**：默认内置 `dsh-voice-butler`；设置里每位管家可填自己的 Skill 名或 Markdown 路径，两者都支持绝对路径。这一层负责怎么寒暄、怎么确认项目需求会话、怎么安排工作与念 Candidate 措辞。名称为 Skill 且无项目时必须也能加载（移除现在的必须选项目限制），失败降级为默认并只在通话里提示一次。
3. **执行 Agent 汇报 Skill**：沿用现有 `handoffSkill` 与 `handoffInstructions`，随每次任务交接下发，管理执行侧怎么回报。

三层按序拼接，且始终在 8,000 字（`MAX_HANDOFF_GUIDANCE_LENGTH`）内裁切，底座优先保留。Guidance 解析保留现有「失败即降级、绝不阻断通话」的语义。

## 回拨

沿用 inbox + 振铃 + 播放排空 ACK。回拨触发条件写进底座：仅在需要用户授权/补充信息、发生会改变结论的意外、或到达任务终态这三类时机主动呼叫；其余进度静默，挂断期间也不打扰。

## 测试与验证

- 单测：domain schema 合法性与 null 拒绝；管家 CRUD 幂等；注入文本包含身份/范围/跟进且不同管家互不串味；路由优先级；`switch_voice_butler` 后必换身份；租赁 key 按管家区分。
- UI 测试：拨号球单击即 startSupervisor、不创建任务；长按面板能列出并新建管家；通话中显示当前管家名。
- 现有 255 项不得回归：`pnpm test`、`pnpm build`、`pnpm verify`、`git diff --check`。
- 不声称的部分：真实麦克风、扬声器听感与人体је声验证仍须人工验收。

## 风险

- 插件没有自己的会话史实，管家摘要可能过时；因此必须允许用户在口头更正，并让管家重写摘要。
- 多位管家共享一份执行 Agent 配额，切换不换模型、不换权限。
- 与相较旧入口：聊天框内的拨号按钮仍绑定当前会话，两者语义不同，UI 需标明「打给总管」而非「打给当前会话」。
