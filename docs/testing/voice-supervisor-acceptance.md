# 独立语音总管测试版验收

版本：0.1.0-alpha.20。基线：alpha.19 / DSH 0.1.5-rc.2。

## alpha.20 自动回归

- 不同 provider callId 收敛到同一 DSH handoff 时，只回写 Function Call 结果，不再创建新的 Qwen 响应，避免重复调用反馈循环。
- “汇报啊”“现在什么进展”“把结果告诉我”“你查一下再告诉我”等短句进入只读结果查询；明确的“再写一份工作汇报”仍可执行。
- 设置页新增独立音色试听：Host 读取百炼凭据，用固定短句生成 WAV；浏览器只收到音频，可停止播放，不创建 DSH 任务。
- `pnpm test`：46 个测试文件、253 项测试通过；`pnpm build` 与 `pnpm verify` 通过。
- 真实麦克风、真实百炼试听和长会话重复播报仍需安装 alpha.20 后人工验收。
本次开发使用隔离工作树，不读取凭据明文，不修改 DSH 源码。

## 自动化证据

- `pnpm test`：238 项测试（42 个文件）通过。
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
| 回拨存储恢复、旧审批不能恢复为可批准请求 | PARTIAL | 解析与串行存储测试通过；桌面重启持久化待验收 |
| checkbox 与标题同排，360/600/1200px 布局 | NOT TESTED | 已改固定选择列，尚未取得桌面矩形/截图证据 |
| 响铃时长、接听/稍后停铃 | PARTIAL | 原有定时器测试通过；扬声器听感待验收 |
| 两套 Skill 分开、失败可见 | PASS | 解析器及配置接线；真实项目 Skill 内容待验收 |
| 挂断后任务完成回流且不重复 | PARTIAL | 稳定终态键及播放 ACK 已接入，真实模型仍可能复述，需要人工测试 |
| 本地安装与桌面启动 | PASS | desktop profile link 的 package.json 为 alpha.19；DSH Desktop 2.0.13 已启动，启动日志无错误 |
| 最新桌面实际菜单 | NOT TESTED | Mac 已锁定；Desktop 禁止普通浏览器访问，HTTP 返回 403，未修改此设置 |

## 必须保留的边界

- 未证明用户先前“接听立即停播”的唯一根因。已经修正取消竞态和交付确认，不声称真实停播问题彻底解决。
- 持久化目前针对已生成的回拨条目；DSH 重启期间尚未产出条目的运行任务不保证补录。结果仍可通过目录主动查询。
- 未做 ChatGPT 跨应用执行桥。
- 语音交付确认不是内容语义验证；真实模型的汇报准确性仍需人工验收。
- 旧 Web/Direct 绑定模式不自动升级为独立总管，Direct 不支持新目录工具。

## 本地交付记录

- 实现提交：`595e9f3`，已推送 `feat/voice-supervisor` 与 `feat/dsh-0.1.5-compat`。
- 本地安装位置：`/Users/bofeng/Development/WorkSpace/my/AI/dsh-realtime-voice`；
  原 desktop profile link 保持不变，通过 fast-forward 同步构建产物。
- 同步后在实际 link 目标再次运行 `pnpm test`（238/238）和 `pnpm verify`，通过。
- 旧 `v0.1.0-alpha.18` 保留。没有重写 profile、凭据或其它项目。
- 桌面菜单、播放听感、供应端真实连接和多任务问答仍需解锁 Mac 后验收。

## 手工回归顺序

1. 在 DSH 右下角打开「电话 · 语音总管」，未打开聊天时拨号，确认没有新建执行会话。
2. 选择安全测试项目和 Agent，新建测试任务；说“创建 hello.txt，写 hello voice supervisor”。
3. 工作中补充“不要修改其他文件”，确认进入同一任务。
4. 挂断后等完成，接听回拨，不讲话，确认汇报完整；再测试主动插话。
5. 请求“汇报啊”，对象不明时应询问；不应修改或合并文件。
6. 设计一个需要问题/审批的安全任务，确认回拨和口头回答。
7. 点击已读后取消，条目应保留；确认已读仅移除汇报，不删除会话。
8. 响铃设置为 10 秒，跨多个轮询观察；点击稍后立即停铃。
9. 多条报告分别接听/重听，确认旧播放回执不会误清新报告。
10. 设置语音总管 Skill 为空、有效路径、无效路径分别测试；与执行 Agent 指导区分。

## 无敏感正文的诊断

在启动 DSH 的进程环境设置 `DSH_VOICE_DIAGNOSTICS=1` 可启用 `[voice-lifecycle]`。
事件只包含 callId、reportId、responseId、requestId、时间、事件类型和取消来源。
不记录音频、API Key、用户正文或完整提示词。不要在运行中的真实项目上发测试任务。
