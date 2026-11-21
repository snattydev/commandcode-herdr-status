// Reports this session's state through OSC 7501 (the Program Status Protocol),
// so terminals and agent inboxes (Herdr, Ghostty, cmux, ...) can show
// working / blocked / idle without reading the screen.
import fs from "node:fs";
import type {ModApi} from "@commandcode/harness";

const APP = "command-code";
const ESC = "\x1b";

function b64(text: string): string {
	return Buffer.from(text, "utf8").toString("base64");
}

export default function (cmd: ModApi): void {
	let tty: number | null = null;
	let last = "";

	const write = (text: string) => {
		if (tty === null) {
			try {
				tty = fs.openSync("/dev/tty", "w");
			} catch {
				tty = -1;
			}
		}
		try {
			if (tty >= 0) fs.writeSync(tty, text);
			else process.stdout.write(text);
		} catch {
			try {
				process.stdout.write(text);
			} catch {
				// nowhere to write: a terminal without a tty
			}
		}
	};

	const report = (state: string, extra: Record<string, string> = {}) => {
		const fields: Record<string, string> = {state, app: APP, ...extra};
		const body = Object.entries(fields)
			.map(([k, v]) => `${k}=${v}`)
			.join(":");
		const seq = `${ESC}]7501;${body}${ESC}\\`;
		if (seq === last) return;
		last = seq;
		write(seq);
	};

	const withMsg = (text?: string): Record<string, string> =>
		text ? {msg: b64(text)} : {};

	cmd.hooks({
		onSessionStart: () => report("idle"),
		onPermissionRequest: ({description}) => {
			report("blocked", {kind: "permission", ...withMsg(description)});
			return undefined; // never answer for the person
		},
	});

	cmd.on("run_start", () => report("working"));

	cmd.on("tool_running", event => {
		if (event.type !== "tool_running") return;
		if (event.toolName === "ask_user_question") {
			report("blocked", {kind: "question", ...withMsg(event.description)});
		} else {
			report("working");
		}
	});

	cmd.on("tool_completed", event => {
		if (event.type === "tool_completed" && event.toolName === "ask_user_question") {
			report("working");
		}
	});

	cmd.on("tool_errored", event => {
		if (event.type === "tool_errored" && event.toolName === "ask_user_question") {
			report("working");
		}
	});

	cmd.on("run_end", event => {
		const reason = event.type === "run_end" ? event.result?.stopReason : undefined;
		report(reason === "interrupted" ? "idle" : "done");
	});

	cmd.on("interrupted", () => report("idle"));
	cmd.on("run_error", () => report("error"));
}
