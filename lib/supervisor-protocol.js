import { isVoiceClientControl } from "./protocol.js";
//#region src/supervisor-protocol.ts
const VOICE_SUPERVISOR_PROTOCOL = "dsh.voice.supervisor.v1";
const VOICE_DIRECTORY_ROUTE = "/api/realtime-voice/directory";
function isSupervisorHello(raw) {
	if (typeof raw !== "object" || raw === null) return false;
	const value = raw;
	return value.protocol === "dsh.voice.supervisor.v1" && value.type === "voice.hello" && isVoiceClientControl({
		...value,
		protocol: "dsh.voice.v1",
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
	"submit_voice_task",
	"cancel_voice_task"
];
const descriptions = {
	list_voice_projects: "列出 DSH 已登记项目。",
	list_voice_agents: "列出 DSH 可用执行 Agent preset。",
	list_voice_tasks: "列出已有任务；不创建任务，不执行工作。",
	read_voice_task_result: "读取指定任务的权威终态和结果，用于口头汇报。空闲不代表没有结果。",
	select_voice_task: "明确选择用户指定的已有执行任务，不能擅自推断目标。",
	create_voice_task: "用户明确要求新任务并确认项目及 Agent 后创建空白执行任务，不自动执行。",
	submit_voice_task: "用户新一轮明确下达工作后提交到已选任务；正在执行时补充会 steer。听汇报不得调用。",
	cancel_voice_task: "用户明确要求停止时取消已选择的任务。"
};
const SUPERVISOR_TOOLS = SUPERVISOR_TOOL_NAMES.map((name) => {
	const properties = name === "create_voice_task" ? {
		workspace: { type: "string" },
		presetId: { type: "string" }
	} : name === "submit_voice_task" ? { instruction: {
		type: "string",
		maxLength: 12e3
	} } : name === "select_voice_task" || name === "read_voice_task_result" ? { taskId: { type: "string" } } : {};
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
export { SUPERVISOR_TOOLS, SUPERVISOR_TOOL_NAMES, VOICE_DIRECTORY_ROUTE, VOICE_SUPERVISOR_PROTOCOL, isSupervisorHello, parseSupervisorArguments };

//# sourceMappingURL=supervisor-protocol.js.map