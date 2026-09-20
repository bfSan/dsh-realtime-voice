# 独立电话协议

WebSocket 沿用 `/plugins/realtime-voice/v1`。客户端 hello 的 protocol 为
`dsh.voice.supervisor.v1`；client/audio/resume 与既有协议一致，target 可省略。
省略 target 时仅建立媒体电话，不创建执行 session。voice.ready 回显新协议。

旧 `dsh.voice.v1` 与 `dsh.voice.direct.v1` 仍要求原有 target，兼容边界不变。

客户端新增：

- `voice.select-task`：`taskId`，从权威目录选择已有任务。
- `voice.create-task`：`workspace`（DSH workspace ID）、`presetId`、`requestId`。
  明确创建空白任务，不自动提交工作；同一 requestId 不得修改目标。
- `voice.playback-drained` 增加可选 `lastSequence`。新浏览器必须回传最终播放序号；
  没有该字段的旧客户端仍能通话，但不用于确认汇报完成。
- `voice.cancel-response` 增加可选 source（`local-vad`/`user`），仅用于诊断归因。

Host 新增 `voice.task-selected`（serverSeq/sessionId/running）确认选择；
`voice.error` 保留失败反馈。目录 `GET /api/realtime-voice/directory` 只读，
返回 projects/agents/tasks，仅允许 loopback 与合法 origin。目录服务缺失返回 503。

模型工具：

`list_voice_projects`、`list_voice_agents`、`list_voice_tasks`、
`read_voice_task_result`、`select_voice_task`、`create_voice_task`、
`submit_voice_task`、`cancel_voice_task`；审批/问题回答复用原有工具。
userTurnId 由宿主转写事件产生，模型不能通过参数伪造。
接听汇报或查询结果后撤下执行工具，直到用户新的语音输入到达。

taskId 本轮等于 DSH sessionId；turn/seq 单独返回。readResult 只把
assistant/message 与相应 turn/end 配对，不以任意进度替代完成结果。
执行使用原生 coordinator 的 queue/steer/cancel，不另建执行引擎。
