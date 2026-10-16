/**
 * Goal Mode Plugin (OpenCode V2)
 *
 * Harness-level "/goal" implementation: prompt contract + goal_complete tool
 * arbitration + session.idle watchdog that continues the agent until the goal
 * is verified reached, the round cap is hit, or the user stops it.
 *
 * Ported from the V1 implementation. See /v2/docs/build/plugins/migrate-v1.
 *
 * V1 -> V2 mapping used here:
 *   async ({ client, directory, $ }) => ({...})   Plugin.define({ id, setup(ctx) })
 *   client.app.log                                console (no app.log domain in V2)
 *   client.tui.showToast                          unavailable on server plugins; dropped
 *   client.session.prompt({ path, query, body })  ctx.session.prompt({ sessionID, text })
 *   client.session.messages                       ctx.session.context({ sessionID })
 *   client.session.create/delete (judge)          ctx.generate.text (no throwaway session)
 *   config hook                                   ctx.model.default.get()
 *   "permission.ask"                              ctx.permission.hook("evaluate", ...)
 *   "command.execute.before"                      ctx.command.transform (registers /goal)
 *   tool map + tool()                             ctx.tool.transform + JSON Schema input
 *   event ({ event })                             ctx.event.subscribe()
 *   $ (Bun shell)                                 node:child_process
 */

import { exec } from "node:child_process"
import { homedir } from "node:os"
import { Plugin } from "@opencode/plugin"
import { Goal, type GoalInfo } from "./rpc.js"

interface GoalState {
	sessionID: string
	objective: string
	checkCmd?: string
	maxRounds: number
	round: number
	status: "active" | "done" | "gave_up" | "aborted" | "stopped"
	createdAt: number
}

interface Verdict {
	complete: boolean
	reason: string
	next_action: string
}

const DEFAULT_MAX_ROUNDS = 8
const IDLE_DEBOUNCE_MS = 4000
const CHECK_OUTPUT_LIMIT = 2000
const CHECK_TIMEOUT_MS = 10 * 60 * 1000
const TRANSCRIPT_MESSAGES = 8
const TRANSCRIPT_MSG_LIMIT = 1200

const GOAL_DENY_SHELL = [
	"sudo",
	"sudo *",
	"su *",
	"doas *",
	"rm -rf /*",
	"rm -rf ~",
	"rm -rf ~/*",
	"mkfs*",
	"dd if=*",
	"shutdown*",
	"reboot*",
	"halt*",
	"poweroff*",
	"chmod -R 777 *",
	"chown -R * /",
	"git push --force*",
	"git push -f*",
	"git push * --force*",
	"git push * -f*",
]

const GOAL_ALLOW_EXTERNAL = [
	"~/.local/share/opencode/**",
	"~/.cache/opencode/**",
	"/tmp/**",
	"/private/tmp/**",
]

const wildcard = (pattern: string): RegExp =>
	new RegExp(
		`^${pattern
			.replace(/[.+^${}()|[\]\\]/g, "\\$&")
			.replace(/\*/g, "[\\s\\S]*")
			.replace(/\?/g, "[\\s\\S]")}$`,
	)

const expandHome = (text: string): string => {
	if (!text.includes("~")) return text
	return text.split("~/").join(`${homedir()}/`).split("~").join(homedir())
}

function matchesRule(text: string, patterns: string[]): boolean {
	if (!text) return false
	const segments = new Set<string>()
	for (const variant of new Set([text, expandHome(text)])) {
		segments.add(variant)
		for (const segment of variant.split(/\n|&&|;|\|\|/)) {
			const t = segment.trim()
			if (t) segments.add(t)
		}
	}
	for (const segment of segments) {
		for (const raw of patterns) {
			if (wildcard(expandHome(raw)).test(segment)) return true
		}
	}
	return false
}

const JUDGE_SYSTEM =
	"You are a strict verification judge. You read an agent transcript and an objective, then decide whether the objective is verifiably satisfied. Bias conservative: mark complete only when the transcript contains concrete evidence (passing command output, file diffs, successful checks). Reply with ONLY a single JSON object, no markdown fences, matching: {\"complete\": boolean, \"reason\": string, \"next_action\": string}. If complete is true, reason must state the evidence. If false, next_action must give one concrete next step for the agent."

const USAGE_TEXT = `Usage:
  /goal <objective> [--check "<command>"] [--max <N>]
  /goal stop
  /goal status
Example:
  /goal make all tests pass --check "npm test" --max 5`

/** Watchdog injections are prefixed so the prompt hook can route them. */
const WATCHDOG_PREFIX = "[goal] "

const GOAL_STORAGE_PREFIX = "goal/"

const goalStorageKey = (sessionID: string): string => `${GOAL_STORAGE_PREFIX}${sessionID}`

function isGoalState(value: unknown): value is GoalState {
	if (!value || typeof value !== "object") return false
	const g = value as Record<string, unknown>
	return (
		typeof g.sessionID === "string" &&
		typeof g.objective === "string" &&
		typeof g.maxRounds === "number" &&
		typeof g.round === "number" &&
		(g.status === "active" || g.status === "done" || g.status === "gave_up" || g.status === "aborted" || g.status === "stopped") &&
		typeof g.createdAt === "number"
	)
}

const goals = new Map<string, GoalState>()
// Transient execution state: never persisted. After a restart these must start
// empty, otherwise a stale `true` would block the watchdog forever.
const verifying = new Set<string>()
const busy = new Set<string>()
const idleTimers = new Map<string, ReturnType<typeof setTimeout>>()
// Child -> parent links learned from session.created events. Transient: after
// a restart, running children are gone and links rebuild from new events.
const childSessions = new Map<string, string>()

export const internals = { parseGoalArguments, parseVerdict, truncate, matchesRule, isGoalState, goalStorageKey, goalSystemText, goalStartText, isWatchdogText, buildGoalSessionRules, resolveRoot, goalEventData, GOAL_STORAGE_PREFIX, GOAL_DENY_SHELL, GOAL_ALLOW_EXTERNAL }

function truncate(text: string, limit: number): string {
	if (text.length <= limit) return text
	return `...${text.slice(-limit)}`
}

function parseGoalArguments(raw: string): { objective: string; checkCmd?: string; maxRounds: number } {
	let maxRounds = DEFAULT_MAX_ROUNDS
	let checkCmd: string | undefined
	let s = ` ${raw.trim()} `

	s = s.replace(/\s(?:--max|-m)(?:=|\s+)(\d+)\s/g, (_m, digits: string) => {
		const n = Number(digits)
		if (Number.isInteger(n) && n > 0 && n <= 100) maxRounds = n
		return " "
	})

	const quoted = s.match(/\s(?:--check|-c)(?:=|\s+)("([^"]*)"|'([^']*)')\s/)
	if (quoted) {
		checkCmd = quoted[2] ?? quoted[3]
		s = s.replace(quoted[0], " ")
	} else {
		const bare = s.match(/\s(?:--check|-c)\s+([^\s].*?)(?=\s+(?:--\w|-m\b)|\s*$)/)
		if (bare) {
			checkCmd = bare[1].trim()
			s = s.replace(bare[0], " ")
		}
	}

	const objective = s.replace(/\s+/g, " ").trim()
	return { objective, checkCmd: checkCmd?.trim() || undefined, maxRounds }
}

function parseVerdict(text: string): Verdict {
	const fallback: Verdict = {
		complete: false,
		reason: "verifier returned an unreadable verdict",
		next_action: "re-check the goal state yourself, verify, and continue",
	}
	const start = text.indexOf("{")
	const end = text.lastIndexOf("}")
	if (start === -1 || end <= start) return fallback
	try {
		const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
		return {
			complete: parsed.complete === true,
			reason: typeof parsed.reason === "string" ? parsed.reason : fallback.reason,
			next_action: typeof parsed.next_action === "string" ? parsed.next_action : fallback.next_action,
		}
	} catch {
		return fallback
	}
}

function isTextPart(part: unknown): part is { type: "text"; text: string } {
	return !!part && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string"
}

function isGoalActive(goal: GoalState | undefined): goal is GoalState {
	return !!goal && goal.status === "active"
}

/** V2 session transcripts are a wide union; pull readable text defensively. */
function transcriptText(messages: readonly unknown[]): string[] {
	const lines: string[] = []
	for (const entry of messages) {
		if (!entry || typeof entry !== "object") continue
		const msg = entry as Record<string, unknown>
		const info = (msg.info ?? msg) as Record<string, unknown>
		const role = typeof info.role === "string" ? info.role.toUpperCase() : "MESSAGE"

		let text = ""
		if (typeof info.text === "string") {
			text = info.text
		} else if (Array.isArray(info.parts)) {
			text = info.parts.filter(isTextPart).map((p) => p.text).join("\n")
		} else if (Array.isArray(msg.parts)) {
			text = msg.parts.filter(isTextPart).map((p) => p.text).join("\n")
		}
		text = text.trim()
		if (text) lines.push(`${role}: ${truncate(text, TRANSCRIPT_MSG_LIMIT)}`)
	}
	return lines
}

/**
 * Full goal contract, delivered as a system instruction on every model call
 * (context hook). Keeps the user-visible transcript clean: the old preamble
 * injected this as prompt text.
 */
function goalSystemText(goal: GoalState): string {
	const verification = goal.checkCmd
		? `Deterministic check: \`${goal.checkCmd}\` must exit with code 0.`
		: "An LLM judge reviews the transcript and decides completion."
	return `--- GOAL CONTRACT (authoritative, managed by the goal plugin) ---
Objective: ${goal.objective}
Verification: ${verification}
Round budget: ${goal.maxRounds} (currently round ${goal.round})
Rules:
- Work autonomously. Verify your own work (run the check command when defined).
- When you believe the objective is met, call the \`goal_complete\` tool with concrete evidence.
- If the verifier rejects, keep working. Do not stop early and do not ask the user questions.
- If truly blocked, call the \`goal_block\` tool with what you tried.
- Prefer actions that need no manual approval. If a required action is likely gated by permissions, state that in \`goal_block\` instead of triggering repeated permission prompts.
---`
}

/** Short user-visible message that starts goal mode; the contract rides along as system text. */
function goalStartText(goal: GoalState): string {
	const verification = goal.checkCmd ? `check: \`${goal.checkCmd}\`` : "verification: LLM judge"
	return `Goal mode started. Objective: ${goal.objective} (${verification}, max ${goal.maxRounds} rounds). The full contract is attached as a system instruction. Work autonomously toward the objective.`
}

function isWatchdogText(text: string): boolean {
	return text.startsWith(WATCHDOG_PREFIX)
}

/** JSON-safe snapshot of a goal for RPC methods and events. */
function goalEventData(goal: GoalState): GoalInfo {
	return {
		sessionID: goal.sessionID,
		objective: goal.objective,
		checkCmd: goal.checkCmd ?? "",
		status: goal.status,
		round: goal.round,
		maxRounds: goal.maxRounds,
		createdAt: goal.createdAt,
	}
}

/**
 * Resolve the root session by following child->parent links (same idea as
 * herdr-agent-state.js childSessions). Cycle-safe: stops on repeats.
 */
function resolveRoot(sessionID: string, parentOf: ReadonlyMap<string, string>): string {
	let root = sessionID
	const seen = new Set<string>([root])
	for (;;) {
		const parent = parentOf.get(root)
		if (!parent || seen.has(parent)) break
		seen.add(parent)
		root = parent
	}
	return root
}

interface GoalSessionRule {
	readonly action: string
	readonly resource: string
	readonly effect: "allow" | "deny" | "ask"
}

/**
 * Session-scoped permission rules applied on /goal start (via
 * ctx.session.update). Evaluated after the agent's rules, last match wins;
 * child sessions inherit the rules in effect when they are created.
 * NOTE: SDK 2.0.26 has no ctx.permission.rules (docs describe a newer API);
 * session.update permissions is the equivalent mechanism.
 */
function buildGoalSessionRules(): GoalSessionRule[] {
	const rules: GoalSessionRule[] = GOAL_DENY_SHELL.map((resource) => ({ action: "shell", resource, effect: "deny" as const }))
	rules.push({ action: "external_directory", resource: "*", effect: "deny" })
	for (const resource of GOAL_ALLOW_EXTERNAL) rules.push({ action: "external_directory", resource, effect: "allow" })
	return rules
}

export default Plugin.define({
	id: "goal",
	async setup(ctx) {
		const directory = ctx.location.directory

		const log = {
			info: (msg: string) => console.log(`[goal] ${msg}`),
			warn: (msg: string) => console.error(`[goal] ${msg}`),
		}

		// ---- durable goal state -------------------------------------------
		// goals survives restarts via ctx.storage; verifying/busy/timers are
		// transient and always start empty.
		// Replays the command transform so /goal reflects current goal state.
		// Best-effort: a failed reload must never break goal bookkeeping.
		const refreshCommands = async (): Promise<void> => {
			try {
				await ctx.command.reload()
			} catch (e) {
				log.warn(`command reload failed: ${e}`)
			}
		}
		const persistGoal = async (goal: GoalState): Promise<void> => {
			try {
				await ctx.storage.set(goalStorageKey(goal.sessionID), { ...goal })
			} catch (e) {
				log.warn(`persist failed for ${goal.sessionID}: ${e}`)
			}
			await refreshCommands()
		}
		const dropGoal = async (sessionID: string): Promise<void> => {
			goals.delete(sessionID)
			try {
				await ctx.storage.remove(goalStorageKey(sessionID))
			} catch (e) {
				log.warn(`storage remove failed for ${sessionID}: ${e}`)
			}
			await refreshCommands()
		}
		// Session-scoped rules (deny dangerous shells, confine external
		// directories). Children created after this inherit them automatically.
		const applyGoalRules = async (sessionID: string): Promise<void> => {
			try {
				await ctx.session.update({ sessionID, permissions: buildGoalSessionRules() })
			} catch (e) {
				log.warn(`could not apply goal permission rules: ${e}`)
			}
		}
		const clearGoalRules = async (sessionID: string): Promise<void> => {
			try {
				await ctx.session.update({ sessionID, permissions: [] })
			} catch (e) {
				log.warn(`could not clear goal permission rules: ${e}`)
			}
		}
		// Assigned once the RPC registration exists below. settleVerdict and
		// the tools call it; before registration it is a no-op.
		let emitGoalEvent: (goal: GoalState) => Promise<void> = async () => {}
		try {
			let after: string | undefined
			for (;;) {
				const page = await ctx.storage.scan({ prefix: GOAL_STORAGE_PREFIX, after, limit: 100 })
				for (const entry of page.entries) {
					if (isGoalState(entry.value)) goals.set(entry.value.sessionID, entry.value)
					else log.warn(`ignoring malformed stored goal at ${entry.key}`)
				}
				if (!page.next) break
				after = page.next
			}
			if (goals.size) log.info(`rehydrated ${goals.size} goal(s) from storage`)
		} catch (e) {
			log.warn(`goal rehydration failed: ${e}`)
		}

		// V1 read this from the config hook as a fallback. V2 exposes the session default model.
		let judgeModel: { providerID: string; modelID: string } | undefined =
			process.env.OPENCODE_GOAL_JUDGE_MODEL?.includes("/")
				? (() => {
						const [providerID, ...rest] = process.env.OPENCODE_GOAL_JUDGE_MODEL!.split("/")
						const modelID = rest.join("/")
						return providerID && modelID ? { providerID, modelID } : undefined
					})()
				: undefined
		if (!judgeModel) {
			try {
				const fallback = await ctx.model.default()
				const info = fallback?.data
				if (info) judgeModel = { providerID: info.providerID, modelID: info.id }
			} catch {
				// no default model yet; generate.text will use its own default
			}
		}

		const inject = async (sessionID: string, text: string) => {
			try {
				// Watchdog continuations queue behind in-flight work; the
				// prompt hook enforces this too. User commands pass their own
				// delivery through (steer).
				await ctx.session.prompt({ sessionID, text, delivery: "queue" })
			} catch (e) {
				log.warn(`continuation injection failed for ${sessionID}: ${e}`)
			}
		}

		const runCheck = async (cmd: string, cwd: string): Promise<{ ok: boolean; output: string }> => {
			try {
				const { code, output } = await new Promise<{ code: number; output: string }>((resolve) => {
					exec(cmd, { cwd, timeout: CHECK_TIMEOUT_MS }, (err, stdout, stderr) => {
						const code = err ? (typeof err.code === "number" ? err.code : 1) : 0
						const extra = err?.killed ? "\n[check timed out]" : ""
						resolve({ code, output: `${stdout}${stderr}${extra}` })
					})
				})
				return { ok: code === 0, output: truncate(output.trim(), CHECK_OUTPUT_LIMIT) }
			} catch (e) {
				return { ok: false, output: `check command could not run: ${e}` }
			}
		}

		const runJudge = async (goal: GoalState, sessionID: string): Promise<Verdict> => {
			try {
				const messages = await ctx.session.context({ sessionID })
				const lines = transcriptText(messages as readonly unknown[])
				const tail = lines.slice(-TRANSCRIPT_MESSAGES).join("\n\n")

				const res = await ctx.generate.text({
					...(judgeModel ? { model: { providerID: judgeModel.providerID, id: judgeModel.modelID } } : {}),
					prompt: `${JUDGE_SYSTEM}\n\nObjective:\n${goal.objective}\n\nAgent transcript (latest turns):\n${tail || "(empty)"}\n\nDecide whether the objective is verifiably satisfied. Reply with ONLY the JSON object.`,
				})
				return parseVerdict(res.text ?? "")
			} catch (e) {
				log.warn(`judge failed: ${e}`)
				return parseVerdict("")
			}
		}

		const verify = async (goal: GoalState, sessionID: string): Promise<Verdict> => {
			if (goal.checkCmd) {
				const r = await runCheck(goal.checkCmd, directory)
				if (!r.ok) {
					return {
						complete: false,
						reason: `check command failed:\n${r.output}`,
						next_action: "Fix the failures shown above, then verify again.",
					}
				}
				return { complete: true, reason: `check command passed:\n${r.output}`, next_action: "" }
			}
			return runJudge(goal, sessionID)
		}

		const settleVerdict = async (goal: GoalState, verdict: Verdict): Promise<{ ended: boolean; message: string }> => {
			if (goal.status !== "active") return { ended: true, message: "Goal mode already ended." }
			if (verdict.complete) {
				goal.status = "done"
				await persistGoal(goal)
				await emitGoalEvent(goal)
				await clearGoalRules(goal.sessionID)
				return {
					ended: true,
					message: "VERIFIED COMPLETE. Write the final summary for the user: what was done and the evidence.",
				}
			}
			goal.round++
			if (goal.round >= goal.maxRounds) {
				goal.status = "gave_up"
				await persistGoal(goal)
				await emitGoalEvent(goal)
				await clearGoalRules(goal.sessionID)
				return {
					ended: true,
					message: `NOT VERIFIED. Round cap (${goal.maxRounds}) reached — stop working and summarize the current state and blockers for the user.`,
				}
			}
			await persistGoal(goal)
			await emitGoalEvent(goal)
			return {
				ended: false,
				message: `NOT VERIFIED (round ${goal.round}/${goal.maxRounds}): ${verdict.reason}\nNext action: ${verdict.next_action}\nContinue autonomously toward the goal. Do not ask the user questions.`,
			}
		}

		const clearIdleTimer = (sessionID: string) => {
			const t = idleTimers.get(sessionID)
			if (t) {
				clearTimeout(t)
				idleTimers.delete(sessionID)
			}
		}

		// True when any session in the root's family (root included) is busy.
		// Prevents verifying the root while a subagent is still working.
		const familyBusy = (root: string): boolean => {
			if (busy.has(root)) return true
			for (const child of childSessions.keys()) {
				if (busy.has(child) && resolveRoot(child, childSessions) === root) return true
			}
			return false
		}

		const onIdle = async (sessionID: string) => {
			// Always arbitrate at the root: child sessions never own goals.
			const root = resolveRoot(sessionID, childSessions)
			const goal = goals.get(root)
			if (!isGoalActive(goal) || verifying.has(root) || busy.has(root) || familyBusy(root)) return
			verifying.add(root)
			try {
				const verdict = await verify(goal, root)
				const { ended, message } = await settleVerdict(goal, verdict)
				if (ended && goal.status !== "done" && goal.status !== "gave_up") return
				await inject(root, `${WATCHDOG_PREFIX}${message}`)
			} finally {
				verifying.delete(root)
			}
		}

		const scheduleIdleCheck = (sessionID: string) => {
			clearIdleTimer(sessionID)
			idleTimers.set(
				sessionID,
				setTimeout(() => {
					idleTimers.delete(sessionID)
					void onIdle(sessionID)
				}, IDLE_DEBOUNCE_MS),
			)
		}

		// The goal contract ships as a system instruction on every model call
		// (context hook below), so user-visible prompts stay short.

		// Shared stop path for the /goal command and the RPC stopGoal method.
		const stopGoalById = async (sessionID: string): Promise<boolean> => {
			const goal = goals.get(sessionID)
			if (!goal) return false
			goal.status = "stopped"
			await persistGoal(goal)
			await dropGoal(sessionID)
			await emitGoalEvent(goal)
			await clearGoalRules(sessionID)
			clearIdleTimer(sessionID)
			return true
		}

		// ---- RPC: listGoals/stopGoal + updated/verified/blocked events -------
		// The TUI half (tui.tsx) reads state here and renders it; event
		// subscriptions are live-only, so listGoals is the recovery path.
		const goalRpc = await ctx.rpc.register(Goal, {
			listGoals: async () => ({
				entries: [...goals.values()].sort((a, b) => a.createdAt - b.createdAt).map(goalEventData),
			}),
			stopGoal: async (input, rpcCtx) => {
				const sessionID = (input as { sessionID?: unknown })?.sessionID
				if (typeof sessionID !== "string" || !sessionID) {
					return rpcCtx.error("not_found", "Missing sessionID", { sessionID: "" })
				}
				const stopped = await stopGoalById(sessionID)
				if (!stopped) return rpcCtx.error("not_found", "No goal in session", { sessionID })
				return { stopped: true }
			},
		})
		emitGoalEvent = async (goal: GoalState): Promise<void> => {
			try {
				const data = goalEventData(goal)
				if (goal.status === "done") await goalRpc.events.emit("verified", data)
				else if (goal.status === "active") await goalRpc.events.emit("updated", data)
				else await goalRpc.events.emit("blocked", data)
			} catch (e) {
				log.warn(`goal event emit failed: ${e}`)
			}
		}

		// ---- /goal command -----------------------------------------------------
		// V1 intercepted "command.execute.before" to rewrite the /goal prompt.
		// V2 has no global pre-command hook, so the plugin owns the command. It
		// also sets the goal-runner agent that commands/goal.md used to set, which
		// makes that Markdown command redundant.
		await ctx.command.transform((editor) => {
			editor.add({
				name: "goal",
				description: "Drive the agent autonomously until a verifiable goal is reached (goal mode)",
				async execute({ sessionID, prompt, delivery }) {
					// Defensive: the expanded prompt may or may not carry the command name.
					// User invocations keep the requested delivery (steer); only
					// watchdog continuations use queue (see inject + prompt hook).
					const raw = (prompt.text ?? "").trim()
					const args = raw.replace(/^\/?goal\b\s*/i, "").trim()

					if (args === "stop") {
						await stopGoalById(sessionID)
						clearIdleTimer(sessionID)
						await ctx.session.prompt({
							sessionID,
							delivery,
							text: "Goal mode was stopped by the user. Acknowledge in one short sentence. Do not continue goal work.",
						})
						return
					}

					if (args === "status") {
						const goal = goals.get(sessionID)
						const body = goal
							? `Report this goal status verbatim, then stop:\nobjective: ${goal.objective}\nstatus: ${goal.status}\nround: ${goal.round}/${goal.maxRounds}\ncheck command: ${goal.checkCmd ?? "(LLM judge)"}`
							: `No active goal in this session.\n\n${USAGE_TEXT}`
						await ctx.session.prompt({ sessionID, delivery, text: body })
						return
					}

					if (!args) {
						await ctx.session.prompt({ sessionID, delivery, text: USAGE_TEXT })
						return
					}

					const parsed = parseGoalArguments(args)
					if (!parsed.objective) {
						await ctx.session.prompt({ sessionID, delivery, text: USAGE_TEXT })
						return
					}

					const goal: GoalState = {
						sessionID,
						objective: parsed.objective,
						checkCmd: parsed.checkCmd,
						maxRounds: parsed.maxRounds,
						round: 0,
						status: "active",
						createdAt: Date.now(),
					}
					goals.set(sessionID, goal)
					await persistGoal(goal)
					await applyGoalRules(sessionID)
					clearIdleTimer(sessionID)

					// Preserve the agent that commands/goal.md frontmatter selected.
					await ctx.session.switchAgent({ sessionID, agent: "goal-runner" }).catch((e) => {
						log.warn(`could not switch to goal-runner: ${e}`)
					})

					// The full contract rides along as a system instruction on every
					// model call (context hook); the user-visible prompt stays short
					// so transcripts are not polluted.
					await ctx.session.prompt({ sessionID, delivery, text: goalStartText(goal) })
				},
			})
		})

		// ---- goal_complete / goal_block tools ---------------------------------
		// options.permission names the V2 permission action, which keeps the
		// { action: "goal_complete", effect: "deny" } agent rules in opencode.json working.
		await ctx.tool.transform((editor) => {
			editor.add({
				name: "goal_complete",
				description:
					"Declare that the active goal is complete. A verifier (check command and/or LLM judge) arbitrates the claim. Provide concrete evidence: commands run, their output, files changed.",
				input: {
					type: "object",
					properties: {
						evidence: {
							type: "string",
							description: "Concrete evidence that the objective is satisfied (command output, diffs)",
						},
					},
					required: ["evidence"],
					additionalProperties: false,
				},
				options: { permission: "goal_complete" },
				async execute(_input, toolCtx) {
					const root = resolveRoot(toolCtx.sessionID, childSessions)
					if (root !== toolCtx.sessionID) {
						return { content: "Goal tools are only available in the root goal session, not in subagents. Report your result normally and let the root session decide." }
					}
					const goal = goals.get(root)
					if (!goal || goal.status !== "active") return { content: "No active goal in this session." }
					if (verifying.has(root)) {
						return { content: "Verifier busy. Wait briefly, then call goal_complete again." }
					}
					verifying.add(root)
					try {
						const verdict = await verify(goal, root)
						const { message } = await settleVerdict(goal, verdict)
						return { content: message }
					} finally {
						verifying.delete(root)
					}
				},
			})

			editor.add({
				name: "goal_block",
				description:
					"Report that the active goal cannot be reached (missing access, unsatisfiable requirement, repeated dead ends). Ends goal mode. Explain what was tried.",
				input: {
					type: "object",
					properties: {
						reason: { type: "string", description: "Why the goal cannot be reached, and what was tried" },
					},
					required: ["reason"],
					additionalProperties: false,
				},
				options: { permission: "goal_block" },
				async execute(input, toolCtx) {
					const reason = String((input as { reason?: unknown })?.reason ?? "")
					const root = resolveRoot(toolCtx.sessionID, childSessions)
					if (root !== toolCtx.sessionID) {
						return { content: "Goal tools are only available in the root goal session, not in subagents. Report your result normally and let the root session decide." }
					}
					const goal = goals.get(root)
					if (!goal || goal.status !== "active") return { content: "No active goal in this session." }
					goal.status = "gave_up"
					await persistGoal(goal)
					await emitGoalEvent(goal)
					await clearGoalRules(root)
					clearIdleTimer(root)
					return {
						content: `Block acknowledged. Goal mode ended. Summarize the blocker and the current state for the user:\n${truncate(reason, 2000)}`,
					}
				},
			})
		})

		// ---- permission arbitration -------------------------------------------
		// V1 "permission.ask" (input.type / input.pattern / output.status)
		// V2 ctx.permission.hook("evaluate") mutates one evaluation object.
		await ctx.permission.hook("evaluate", (evaluation) => {
			const root = resolveRoot(evaluation.sessionID, childSessions)
			const goal = goals.get(root)
			if (!isGoalActive(goal)) return
			// Subagents do goal work under the same policy, but only the root
			// session may settle the goal.
			if (root !== evaluation.sessionID && (evaluation.action === "goal_complete" || evaluation.action === "goal_block")) {
				log.info(`denied ${evaluation.action} from subagent session ${evaluation.sessionID}`)
				evaluation.effect = "deny"
				return
			}
			const mode = process.env.OPENCODE_GOAL_PERMISSION ?? "smart"
			const subject = evaluation.resources.filter(Boolean).join("\n")

			if (mode === "allow") {
				log.info(`auto-allowed permission during goal mode: ${evaluation.action} ${subject}`)
				evaluation.effect = "allow"
				return
			}
			if (mode === "deny") {
				log.info(`auto-denied permission during goal mode: ${evaluation.action} ${subject}`)
				evaluation.effect = "deny"
				return
			}
			if (mode === "ask") {
				log.info(`goal mode is paused: permission needed for "${subject}". Approve or deny to resume.`)
				return
			}

			if (evaluation.action === "shell" && matchesRule(subject, GOAL_DENY_SHELL)) {
				log.info(`goal mode denied dangerous command: ${subject}`)
				evaluation.effect = "deny"
				return
			}
			if (evaluation.action === "external_directory") {
				const ok = matchesRule(subject, GOAL_ALLOW_EXTERNAL)
				if (!ok) log.warn(`goal mode denied external directory: ${subject}`)
				evaluation.effect = ok ? "allow" : "deny"
				return
			}
			log.info(`goal mode auto-allowed: ${evaluation.action} ${subject}`)
			evaluation.effect = "allow"
		})

		// ---- session hooks: contract without transcript pollution ------------
		const hookRegistrations: Array<{ dispose: () => Promise<void> }> = []

		// Every agent-loop model call carries the goal contract as a system
		// instruction. Nothing user-visible is injected.
		hookRegistrations.push(
			await ctx.session.hook("context", (event) => {
				const goal = goals.get(event.sessionID)
				if (!isGoalActive(goal)) return
				event.system.push({ type: "text", text: goalSystemText(goal) })
			}),
		)

		// Compaction would otherwise drop the objective/round/checkCmd. Keep
		// them in the summary path: nudge the summarizer via system text, and
		// prefix an already-computed summary so the state survives.
		hookRegistrations.push(
			await ctx.session.hook("compaction", (event) => {
				const goal = goals.get(event.sessionID)
				if (!isGoalActive(goal)) return
				event.system.push({
					type: "text",
					text: `Active goal survives this compaction. Preserve verbatim: objective=${JSON.stringify(goal.objective)} round=${goal.round}/${goal.maxRounds} check=${JSON.stringify(goal.checkCmd ?? "LLM judge")}.`,
				})
				if (event.result) {
					event.result = {
						...event.result,
						summary: `[goal] objective=${JSON.stringify(goal.objective)} round=${goal.round}/${goal.maxRounds} check=${JSON.stringify(goal.checkCmd ?? "LLM judge")}\n${event.result.summary}`,
					}
				}
			}),
		)

		// Tag goal prompts and keep watchdog continuations ordered behind
		// in-flight work instead of steering (interrupting) it.
		hookRegistrations.push(
			await ctx.session.hook("prompt", (event) => {
				const text = event.prompt.text ?? ""
				const goal = goals.get(event.sessionID)
				if (!isWatchdogText(text)) {
					if (isGoalActive(goal)) event.metadata = { ...event.metadata, source: "goal" }
					return
				}
				event.metadata = { ...event.metadata, source: "goal" }
				event.delivery = "queue"
			}),
		)

		// During the verify loop the judge already arbitrates; a 429 retry
		// storm only delays the verdict. Veto it so verification fails fast
		// and the agent keeps working instead of backing off.
		hookRegistrations.push(
			await ctx.session.hook("retry", (event) => {
				if (!verifying.has(resolveRoot(event.sessionID, childSessions))) return
				if (event.error.status === 429) event.decision = { retry: false }
			}),
		)

		// ---- event watchdog ----------------------------------------------------
		// V2 payload lives under `data` (V1 used `properties`).
		// V1 `session.error` maps to session.execution.failed / .interrupted.
		// Subagent sessions are tracked via session.created parentID (same idea
		// as herdr-agent-state.js childSessions): status/idle events resolve to
		// the root, child turns count toward maxRounds, and only the root may
		// settle the goal.
		const countChildTurn = async (sessionID: string): Promise<void> => {
			const root = resolveRoot(sessionID, childSessions)
			if (root === sessionID) return
			const goal = goals.get(root)
			if (!isGoalActive(goal)) return
			goal.round++
			await persistGoal(goal)
			log.info(`subagent turn counted for goal ${root} (round ${goal.round}/${goal.maxRounds})`)
		}

		const controller = new AbortController()
		void (async () => {
			for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
				const type = event.type
				const data = (event as { data?: Record<string, unknown> }).data ?? {}

				if (type === "session.created") {
					const sessionID = data.sessionID as string | undefined
					const parentID = data.parentID as string | undefined
					if (sessionID && parentID) childSessions.set(sessionID, parentID)
					continue
				}

				if (type === "session.status") {
					const sessionID = data.sessionID as string | undefined
					if (!sessionID) continue
					const root = resolveRoot(sessionID, childSessions)
					const statusType = (data.status as { type?: string } | undefined)?.type
					if (statusType === "idle") {
						const wasBusy = busy.has(sessionID)
						busy.delete(sessionID)
						if (wasBusy) await countChildTurn(sessionID)
						if (isGoalActive(goals.get(root)) && !familyBusy(root)) scheduleIdleCheck(root)
					} else {
						busy.add(sessionID)
					}
					continue
				}

				if (type === "session.idle") {
					const sessionID = data.sessionID as string | undefined
					if (!sessionID) continue
					const root = resolveRoot(sessionID, childSessions)
					const wasBusy = busy.has(sessionID)
					busy.delete(sessionID)
					if (wasBusy) await countChildTurn(sessionID)
					if (isGoalActive(goals.get(root)) && !familyBusy(root)) scheduleIdleCheck(root)
					continue
				}

				if (type === "session.execution.failed" || type === "session.execution.interrupted") {
					const sessionID = data.sessionID as string | undefined
					if (!sessionID) continue
					const root = resolveRoot(sessionID, childSessions)
					const goal = goals.get(root)
					if (!goal || goal.status !== "active") continue
					goal.status = "aborted"
					await persistGoal(goal)
					await emitGoalEvent(goal)
					await clearGoalRules(root)
					clearIdleTimer(root)
					log.warn(
						type === "session.execution.interrupted"
							? "Goal mode paused: run aborted."
							: "Goal mode paused: session error.",
					)
					continue
				}

				if (type === "session.deleted") {
					const sessionID = data.sessionID as string | undefined
					if (!sessionID) continue
					const root = resolveRoot(sessionID, childSessions)
					clearIdleTimer(root)
					await dropGoal(root)
					busy.delete(sessionID)
					verifying.delete(sessionID)
					childSessions.delete(sessionID)
					for (const [child, parent] of childSessions) {
						if (parent === sessionID) childSessions.delete(child)
					}
					continue
				}
			}
		})().catch((e) => log.warn(`event loop stopped: ${e}`))

		return async () => {
			controller.abort()
			for (const t of idleTimers.values()) clearTimeout(t)
			idleTimers.clear()
			// Durability: storage keeps goals across reloads; only transient
			// execution state is cleared here.
			goals.clear()
			busy.clear()
			verifying.clear()
			childSessions.clear()
			try {
				await goalRpc.dispose()
			} catch (e) {
				log.warn(`rpc dispose failed: ${e}`)
			}
			for (const registration of hookRegistrations) {
				try {
					await registration.dispose()
				} catch (e) {
					log.warn(`hook dispose failed: ${e}`)
				}
			}
		}
	},
})
