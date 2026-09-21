import { VOICE_PROTOCOL, isVoiceClientControl } from "./protocol.js";
//#region src/supervisor-protocol.ts
const VOICE_SUPERVISOR_PROTOCOL = "dsh.voice.supervisor.v1";
const VOICE_DIRECTORY_ROUTE = "/api/realtime-voice/directory";
const VOICE_BUTLER_ROUTE = "/api/realtime-voice/butlers";
const MAX_BUTLER_ID_LENGTH = 64;
function isSupervisorHello(raw) {
	if (typeof raw !== "object" || raw === null) return false;
	const value = raw;
	if (value.protocol !== "dsh.voice.supervisor.v1" || value.type !== "voice.hello") return false;
	if (value.butlerId !== void 0 && (typeof value.butlerId !== "string" || value.butlerId.length === 0 || value.butlerId.length > 64)) return false;
	return isVoiceClientControl({
		...value,
		protocol: VOICE_PROTOCOL,
		target: value.target ?? { sessionId: "supervisor" }
	});
}
const SUPERVISOR_TOOL_NAMES = [
	"list_voice_projects",
	"list_voice_agents",
	"list_voice_tasks",
	"read_voice_task_result",
	"select_voice_task",
	"create_voice_task",
	"confirm_voice_task",
	"submit_voice_task",
	"cancel_voice_task",
	"list_voice_butlers",
	"switch_voice_butler",
	"remember_voice_scope",
	"note_voice_todo"
];
const descriptions = {
	list_voice_projects: "列出 DSH 已登记项目。",
	list_voice_agents: "列出 DSH 可用执行 Agent preset。",
	list_voice_tasks: "列出已有任务；不创建任务，不执行工作。",
	read_voice_task_result: "读取指定任务的权威终态和结果，用于口头汇报。空闲不代表没有结果。",
	select_voice_task: "提出一个要交付工作的已有任务，返回它的名称等待用户确认；此时并未绑定，不得据此开始工作。",
	create_voice_task: "提出要为哪份新工作创建任务，返回项目与 Agent 的名称等待用户确认；此时并未创建。",
	confirm_voice_task: "用户亲口确认了上一步的任务对象后才可调用。未经用户口头确认调用无效，会被拒绝。",
	submit_voice_task: "用户新一轮明确下达工作后提交到已选任务；正在执行时补充会 steer。听汇报不得调用。",
	cancel_voice_task: "用户明确要求停止时取消已选择的任务。",
	list_voice_butlers: "列出已有语音总管及其负责范围，用于点名或确认由谁接手。",
	switch_voice_butler: "用户明确点名或要求换人时切换到另一位总管；切换后必须重新自报身份。",
	remember_voice_scope: "记下这位总管负责的范围或偏好，只影响记忆，不执行任何工作。",
	note_voice_todo: "记下这位总管要跟进的事项，只影响记忆，不执行任何工作。"
};
const SUPERVISOR_TOOLS = SUPERVISOR_TOOL_NAMES.map((name) => {
	const properties = name === "create_voice_task" ? {
		workspace: { type: "string" },
		presetId: { type: "string" }
	} : name === "confirm_voice_task" ? { decision: { type: "string" } } : name === "submit_voice_task" ? { instruction: {
		type: "string",
		maxLength: 12e3
	} } : name === "select_voice_task" || name === "read_voice_task_result" ? { taskId: { type: "string" } } : name === "switch_voice_butler" ? { butlerId: { type: "string" } } : name === "remember_voice_scope" || name === "note_voice_todo" ? { note: {
		type: "string",
		maxLength: 2e3
	} } : {};
	return {
		type: "function",
		function: {
			name,
			description: descriptions[name],
			parameters: {
				type: "object",
				additionalProperties: false,
				properties,
				required: Object.keys(properties)
			}
		}
	};
});
function parseSupervisorArguments(name, json) {
	const tool = SUPERVISOR_TOOLS.find((value) => value.function.name === name);
	if (tool === void 0 || json.length > 16384) throw new Error("Unknown or oversized supervisor call");
	const value = JSON.parse(json);
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected object arguments");
	const keys = Object.keys(tool.function.parameters.properties);
	const record = value;
	if (Object.keys(record).some((key) => !keys.includes(key)) || keys.some((key) => typeof record[key] !== "string" || !record[key].trim() || record[key].length > 12e3)) throw new Error("Invalid supervisor arguments");
	return record;
}
//#endregion
export { MAX_BUTLER_ID_LENGTH, SUPERVISOR_TOOLS, SUPERVISOR_TOOL_NAMES, VOICE_BUTLER_ROUTE, VOICE_DIRECTORY_ROUTE, VOICE_SUPERVISOR_PROTOCOL, isSupervisorHello, parseSupervisorArguments };

//# sourceMappingURL=supervisor-protocol.js.map