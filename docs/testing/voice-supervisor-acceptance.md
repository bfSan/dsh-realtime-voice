# 独立语音总管测试版验收

版本：0.1.0-alpha.23。基线：alpha.22 / DSH 0.1.5-rc.2。

## alpha.23 自动回归

- 入口改成右下角拨号球：单击即拨给默认总管；长按 500ms 或右键才打开选人/新建面板。
- 新增可任意创建的语音总管注册表，持久化在官方 storage domain `realtime_voice_butlers`；通话按 `voice-supervisor:<butlerId>` 分别租赁。
- 总管新增四个工具：`list_voice_butlers`、`switch_voice_butler`、`remember_voice_scope`、`note_voice_todo`；切换后按新总管身份重新简报，且不含其他总管的信息。
- 指导文本固定为底座 → 默认规则 → 当前总管身份 → 用户 Skill 四层，底座不可被覆盖。
- Host 新增 loopback-only 的 `/api/realtime-voice/butlers`（GET 列出、POST 新建，限制 4KB 与 32 字称呼）。
- 不同 provider callId 收敛到同一 DSH handoff 时，只回写 Function Call 结果，不再创建新的 Qwen 响应，避免重复调用反馈循环。
- “汇报啊”“现在什么进展”“把结果告诉我”“你查一下再告诉我”等短句进入只读结果查询；明确的“再写一份工作汇报”仍可执行。
- 设置页新增独立音色试听：Host 读取百炼凭据，用固定短句生成 WAV；浏览器只收到音频，可停止播放，不创建 DSH 任务。
- 回拨队列改用 DSH 官方 `defineDomain` 与 Zod schema，存储域名改为合法的 `realtime_voice_inbox`；桌面重启后不再出现存储初始化失败。
- `pnpm test`：49 个测试文件、270 项测试通过；`pnpm build` 与 `pnpm verify` 通过。
- 真实麦克风、实际扬声器试听、拨号球手势、总管切换听感和长会话重复播报仍需安装 alpha.23 后人工验收。
本次开发使用隔离工作树，不读取凭据明文，不修改 DSH 源码。

## 自动化证据

- `pnpm test`：270 项测试（49 个文件）通过。
- `pnpm build`：Host / Client 类型检查和产物构建通过。
- `pnpm verify`：产物校验通过。
- `git diff --check`：通过。

上述命令最终发布提交前重跑；不等价于真实模型或麦克风验收。

| 场景 | 状态 | 证据与限制 |
| --- | --- | --- |
| 独立 hello，无聊天框也能拨号，不隐式创建执行任务 | PASS | supervisor-connection + voice-launcher 测试；模拟供应端 |
| 目录查询结果不提交 prompt，运行中仍可读上轮终态 | PASS | voice-task-directory 测试 |
| 无目标/无新用户轮次不执行，同轮重复调用幂等 | PASS | voice-supervisor 测试 |
| “汇报啊”不转换为合并文件 | PARTIAL | 确定性防护通过；真实模型语义行为未测 |
| 已读确认和 DELETE 失败保留记录 | PASS | overlay / client-inbox-actions 测试 |
| 接听后不讲话，完整播报 | NOT TESTED | Mac 锁定；无法操作麦克风 |
| 插话打断、连续交谈、Qwen Function Calling | NOT TESTED | 未进行真实供应端通话 |
| 短音频尾包、双信号交付、迟到 ACK 不串报告 | PASS | voice-audio-flow / report-delivery 测试 |
| 仅关联取消请求的 no-active-response 被结算 | PASS | dashscope-realtime 测试；其他错误仍保留 |
| 问题/审批回拨、口头回答、多任务切换 | PARTIAL | 原有交互回归通过，真实 Agent 待验收 |
| 回拨存储恢复、旧审批不能恢复为可批准请求 | PARTIAL | 官方存储域可在 Desktop 打开，解析与串行存储测试通过；带真实条目的跨重启恢复待验收 |
| checkbox 与标题同排，360/600/1200px 布局 | NOT TESTED | 已改固定选择列，尚未取得桌面矩形/截图证据 |
| 响铃时长、接听/稍后停铃 | PARTIAL | 原有定时器测试通过；扬声器听感待验收 |
| 两套 Skill 分开、失败可见 | PASS | 解析器及配置接线；真实项目 Skill 内容待验收 |
| 挂断后任务完成回流且不重复 | PARTIAL | 稳定终态键及播放 ACK 已接入，真实模型仍可能复述，需要人工测试 |
| 语音总管注册表持久化、跨通话记住范围与跟进事项 | PARTIAL | butler-registry / butler-route 测试（含 4KB 与空称呼拒绝）；真实 Desktop 跨重启未在含真实条目的情况下验收 |
| 按总管分别租赁、身份简报不串台 | PASS | butler-call-identity 测试：只为被点名的总管注入身份 |
| 三层指导顺序不被用户 Skill 覆盖 | PARTIAL | supervisor-guidance 测试；真实 Skill 文件内容待验收 |
| 本地安装与桌面启动 | PASS | desktop profile link 指向当前仓库；DSH Desktop 2.0.13 已启动，alpha.23 启动日志无插件错误 |
| 拨号球单击即拨、长按/右键才选人 | PARTIAL | voice-launcher 测试覆盖单击与右键；真实长按手势与 Mac 触控板待验收 |
| 最新桌面实际菜单 | NOT TESTED | Mac 已锁定；Desktop 禁止普通浏览器访问，HTTP 返回 403，未修改此设置 |

## 必须保留的边界

- 未证明用户先前“接听立即停播”的唯一根因。已经修正取消竞态和交付确认，不声称真实停播问题彻底解决。
- 持久化目前针对已生成的回拨条目；DSH 重启期间尚未产出条目的运行任务不保证补录。结果仍可通过目录主动查询。
- 未做 ChatGPT 跨应用执行桥。
- 语音交付确认不是内容语义验证；真实模型的汇报准确性仍需人工验收。
- 旧 Web/Direct 绑定模式不自动升级为独立总管，Direct 不支持新目录工具。
- 第一期不做全局快捷键：配置字段已留，未绑定任何系统热键。
- 每位总管的独立音色、风格与偏好只留字段，一律回落全局；等用户明确提出再做。

## 本地交付记录

- alpha.22 基线已推送至 `feat/voice-supervisor` 与 `feat/dsh-0.1.5-compat`；alpha.23 的最终提交见对应版本标签。
- 本地安装位置：`/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice`；
  原 desktop profile link 保持不变，通过 fast-forward 同步构建产物。
- 同步后在实际 link 目标再次运行 `pnpm test`（270/270）和 `pnpm verify`，通过。
- 旧版本标签保留。没有重写 profile、凭据或其它项目。
- 桌面菜单、播放听感、供应端真实连接和多任务问答仍需解锁 Mac 后验收。

## 手工回归顺序

1. 单击右下角拨号球，未打开聊天时也应直接接通默认总管，且不新建执行会话。
  长按（约半秒）或右键，确认出现已有总管列表和「新安排一位总管」。
3. 新建一位叫「运维」的总管并接通，口头说“你以后负责日志清理”，确认它记住范围；
   再新建「写作」并接通，确认它不知道运维那件事。
4. 通话中说“换成写作来接”，确认它自报新身份，并重新确认要做什么。
5. 选择安全测试项目和 Agent，新建测试任务；说“创建 hello.txt，写 hello voice supervisor”。
6. 工作中补充“不要修改其他文件”，确认进入同一任务。
7. 挂断后等完成，接听回拨，不讲话，确认汇报完整；再测试主动插话。
8. 请求“汇报啊”，对象不明时应询问；不应修改或合并文件。
9. 设计一个需要问题/审批的安全任务，确认回拨和口头回答。
10. 点击已读后取消，条目应保留；确认已读仅移除汇报，不删除会话。
11. 响铃设置为 10 秒，跨多个轮询观察；点击稍后立即停铃。
12. 多条报告分别接听/重听，确认旧播放回执不会误清新报告。
13. 设置语音总管 Skill 为空、有效路径、无效路径分别测试；与执行 Agent 指导区分。

## 无敏感正文的诊断

在启动 DSH 的进程环境设置 `DSH_VOICE_DIAGNOSTICS=1` 可启用 `[voice-lifecycle]`。
事件只包含 callId、reportId、responseId、requestId、时间、事件类型和取消来源。
不记录音频、API Key、用户正文或完整提示词。不要在运行中的真实项目上发测试任务。
