/**
 * Handoff Plugin (OpenCode V2)
 *
 * Backs the /handoff command. The running agent writes the summary itself, so
 * no extra summarization model call is needed; this plugin only does the two
 * things an agent cannot do for itself:
 *
 *   1. create a fresh root session in this location
 *   2. seed it with the handoff summary as a synthetic, non-resuming message
 *
 * The old session is never mutated or removed. If anything fails, the tool
 * returns a plain instruction to keep working in the current session, so the
 * conversation is never lost.
 *
 * V2 API used (verified against @opencode/plugin 2.0.20):
 *   ctx.session.create / update / synthetic / context
 *   ctx.tool.transform + JSON Schema input
 *   ctx.rpc.register + registration.events.emit
 *
 * The companion tui.ts subscribes to the `prepared` event and calls
 * context.ui.router.navigate. Only a CLI plugin can switch the active session;
 * the server plugin cannot.
 */

import { Plugin } from "@opencode/plugin"
import { Handoff, type Prepared } from "./rpc.js"

/** Hard ceiling on the seeded summary. ~12000 chars is roughly 1500-2000 words. */
const SUMMARY_CHAR_LIMIT = 12_000
/** Session titles stay short enough to read in the sidebar and tab strip. */
const TITLE_LIMIT = 60
/** Per-message cap in the outline digest. */
const OUTLINE_TEXT_LIMIT = 600
/** Most recent user requests kept in the outline digest. */
const OUTLINE_REQUESTS = 30
/** Most recent paths kept in the outline digest. */
const OUTLINE_PATHS = 60
/** Handoffs remembered per location, for the TUI recovery path. */
const PENDING_LIMIT = 5

const ABS_PATH = /(?:^|[\s(<"'`])((?:~|\.{1,2})?\/[\w.\-/][^\s()<>"'`]*)/g
const REL_PATH = /(?:^|[\s(<"'`])((?:[\w.\-]+\/)+[\w.\-]+\.[A-Za-z0-9]{1,8})\b/g

const SEED_DESCRIPTION = "Handoff summary carried over from the previous session"

function truncate(text: string, limit: number): string {
	if (text.length <= limit) return text
	return `${text.slice(0, limit)}\n\n[... truncated at ${limit} characters ...]`
}

/** Clamp the summary, preferring to cut on a line boundary. */
function clampSummary(raw: string): { text: string; truncated: boolean } {
	const text = raw.trim()
	if (text.length <= SUMMARY_CHAR_LIMIT) return { text, truncated: false }
	const head = text.slice(0, SUMMARY_CHAR_LIMIT)
	const boundary = head.lastIndexOf("\n")
	const cut = boundary > SUMMARY_CHAR_LIMIT * 0.5 ? head.slice(0, boundary) : head
	return {
		text: `${cut}\n\n[... handoff summary truncated at ${SUMMARY_CHAR_LIMIT} characters; write a shorter summary next time ...]`,
		truncated: true,
	}
}

/** Prefer the agent's title, else the first heading, else the first real line. */
function deriveTitle(summary: string, provided?: string): string {
	const fromHeading = summary.match(/^#{1,6}\s+(.+)$/m)?.[1]
	const firstLine =
		fromHeading ??
		summary
			.split("\n")
			.map((line) => line.trim())
			.find((line) => line.length > 0 && !line.startsWith("```") && !/^[-*>#|]/.test(line))
	const cleaned = (provided?.trim() || firstLine || "Handoff")
		.replace(/^[#*_`]+|[`*_#]+$/g, "")
		.replace(/\s+/g, " ")
		.trim()
	return truncate(cleaned.slice(0, TITLE_LIMIT), TITLE_LIMIT).trim() || "Handoff"
}

function messageInfo(message: unknown): Record<string, unknown> {
	if (!message || typeof message !== "object") return {}
	const record = message as Record<string, unknown>
	const info = record.info
	return info && typeof info === "object" ? (info as Record<string, unknown>) : record
}

/** Defensive text extraction: message shapes differ by role and by version. */
function messageText(message: unknown): string {
	const info = messageInfo(message)
	if (typeof info.text === "string") return info.text
	const parts = (info.parts ?? (message as Record<string, unknown>)?.parts) as unknown
	if (!Array.isArray(parts)) return ""
	return parts
		.map((part) => {
			const record = part as Record<string, unknown> | null
			return record && typeof record === "object" && typeof record.text === "string" ? record.text : ""
		})
		.filter(Boolean)
		.join("\n")
}

function collectPaths(text: string, into: Set<string>): void {
	// Trailing sentence punctuation is not part of the path.
	const clean = (value: string) => value.replace(/[.,;:!?)+}\]]+$/, "")
	for (const match of text.matchAll(ABS_PATH)) into.add(clean(match[1]))
	for (const match of text.matchAll(REL_PATH)) into.add(clean(match[1]))
}

/**
 * Bounded digest of a session, used when the conversation is too large to
 * summarize directly from context. Demonstrates reading messages through the
 * plugin context: ctx.session.context({ sessionID }).
 */
function digest(messages: readonly unknown[], requestLimit: number) {
	const counts: Record<string, number> = {}
	const requests: string[] = []
	const paths = new Set<string>()

	for (const message of messages) {
		const info = messageInfo(message)
		const type = typeof info.type === "string" ? info.type : "unknown"
		counts[type] = (counts[type] ?? 0) + 1

		const text = messageText(message)
		if (!text) continue
		collectPaths(text, paths)

		if (type === "user") {
			requests.push(text.trim())
			const files = info.files
			if (Array.isArray(files)) {
				for (const file of files) {
					const name = (file as Record<string, unknown> | null)?.name
					if (typeof name === "string" && name) paths.add(name)
				}
			}
		}
	}

	const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
	const kept = requests.slice(-requestLimit)
	return {
		total,
		counts,
		requests: kept,
		droppedRequests: Math.max(0, requests.length - kept.length),
		paths: [...paths].slice(-OUTLINE_PATHS),
	}
}

function formatDigest(sessionID: string, value: ReturnType<typeof digest>): string {
	const lines = [
		`Session outline: ${sessionID}`,
		`Messages: ${value.total} (${Object.entries(value.counts)
			.sort((a, b) => b[1] - a[1])
			.map(([type, count]) => `${type}=${count}`)
			.join(", ")})`,
		"",
		`User requests, most recent ${value.requests.length} (${value.droppedRequests} older dropped):`,
	]
	for (const [index, request] of value.requests.entries()) {
		lines.push(`${index + 1}. ${truncate(request.replace(/\s+/g, " ").trim(), OUTLINE_TEXT_LIMIT)}`)
	}
	lines.push("", `Paths referenced (${value.paths.length}):`)
	lines.push(value.paths.length ? value.paths.map((path) => `- ${path}`).join("\n") : "(none)")
	lines.push(
		"",
		"This is an outline, not a summary. Use it to reconstruct what matters, then write the handoff summary yourself.",
	)
	return lines.join("\n")
}

export default Plugin.define({
	id: "handoff",
	async setup(ctx) {
		const directory = String(ctx.location.directory)
		const log = {
			info: (message: string) => console.log(`[handoff] ${message}`),
			warn: (message: string) => console.error(`[handoff] ${message}`),
		}

		/** Recent handoffs per location, oldest first. Read-only recovery list. */
		const pending = new Map<string, Prepared[]>()

		const registration = await ctx.rpc.register(Handoff, {
			listPending: async () => ({ entries: pending.get(directory) ?? [] }),
		})

		await ctx.tool.transform((editor) => {
			editor.add({
				name: "handoff_create",
				description:
					"Start a new session seeded with a handoff summary of this conversation, so work can continue with the context intact. Call this once, at the very end, with the finished summary. The current session is preserved untouched.",
				input: {
					type: "object",
					properties: {
						summary: {
							type: "string",
							description:
								"The complete handoff summary. This becomes the seed content of the new session.",
						},
						title: {
							type: "string",
							description:
								"Optional short title for the new session. Derived from the summary when omitted.",
						},
					},
					required: ["summary"],
					additionalProperties: false,
				},
				async execute(input, toolCtx) {
					const args = (input ?? {}) as { summary?: unknown; title?: unknown }
					const raw = typeof args.summary === "string" ? args.summary : ""
					if (!raw.trim()) {
						return {
							content:
								"handoff_create: `summary` was empty. Write the handoff summary first, then call this tool again. Nothing was changed.",
						}
					}

					const fromSessionID = String(toolCtx.sessionID)
					const { text: summary, truncated } = clampSummary(raw)
					const title = deriveTitle(summary, typeof args.title === "string" ? args.title : undefined)

					let created
					try {
						created = await ctx.session.create({
							title,
							location: { directory: ctx.location.directory },
							metadata: { handoff: { from: fromSessionID, at: new Date().toISOString() } },
						})
					} catch (error) {
						log.warn(`session create failed: ${error}`)
						return {
							content: [
								"handoff_create: FAILED to create the new session.",
								`Reason: ${error instanceof Error ? error.message : String(error)}`,
								"",
								"The current session is untouched and still holds the full conversation. Do not retry in a loop.",
								"Tell the user plainly that the handoff did not happen, then keep working in this session.",
							].join("\n"),
						}
					}

					const sessionID = String(created.id)

					try {
						// `resume` is deliberately omitted. Measured against the
						// running server: omitted seeds the message into history with
						// no model turn, `resume: true` also burns a turn on a session
						// the user has not typed into yet, and `resume: false` strands
						// the message in the inbox forever, never persisting it.
						await ctx.session.synthetic({
							sessionID: created.id,
							text: summary,
							description: SEED_DESCRIPTION,
						})
					} catch (error) {
						log.warn(`session seed failed for ${sessionID}: ${error}`)
						return {
							content: [
								`handoff_create: PARTIAL. Session ${sessionID} ("${title}") was created but could not be seeded.`,
								`Reason: ${error instanceof Error ? error.message : String(error)}`,
								"",
								"Do not switch the user into that empty session. Show the summary below to the user and stay here.",
								"",
								summary,
							].join("\n"),
						}
					}

					try {
						// Set last so nothing in flight overwrites it.
						await ctx.session.update({ sessionID: created.id, title })
					} catch (error) {
						log.warn(`title update failed for ${sessionID}: ${error}`)
					}

					const prepared: Prepared = { sessionID, title, fromSessionID, at: Date.now() }
					const history = [...(pending.get(directory) ?? []), prepared].slice(-PENDING_LIMIT)
					pending.set(directory, history)
					try {
						await registration.events.emit("prepared", prepared)
					} catch (error) {
						log.warn(`prepared event not delivered: ${error}`)
					}

					log.info(`seeded ${sessionID} ("${title}") from ${fromSessionID}`)
					return {
						content: [
							"Handoff complete.",
							`New session: ${sessionID}`,
							`Title: ${title}`,
							`Seeded: ${summary.length} characters${truncated ? " (truncated to the plugin limit)" : ""}`,
							`Previous session kept: ${fromSessionID}`,
							"",
							"The terminal moves the user into the new session automatically. Do not repeat the summary.",
							`If it does not switch, tell the user to run the "Open pending handoff session" command, or to open session ${sessionID} from the session list.`,
						].join("\n"),
					}
				},
			})

			editor.add({
				name: "handoff_outline",
				description:
					"Return a bounded outline of a session: message counts by type, the most recent user requests, and referenced file paths. Use this before writing a handoff summary when the conversation is too large to read directly out of context.",
				input: {
					type: "object",
					properties: {
						sessionID: {
							type: "string",
							description: "Session to outline. Defaults to the current session.",
						},
						requests: {
							type: "integer",
							description: `How many recent user requests to include. Default ${OUTLINE_REQUESTS}.`,
						},
					},
					additionalProperties: false,
				},
				async execute(input, toolCtx) {
					const args = (input ?? {}) as { sessionID?: unknown; requests?: unknown }
					const target = typeof args.sessionID === "string" ? args.sessionID : String(toolCtx.sessionID)
					const requested = typeof args.requests === "number" ? Math.floor(args.requests) : OUTLINE_REQUESTS
					const limit = Math.min(Math.max(requested, 1), 200)

					try {
						const messages = await ctx.session.context({ sessionID: target })
						return { content: formatDigest(target, digest(messages as readonly unknown[], limit)) }
					} catch (error) {
						return {
							content: `handoff_outline: could not read session ${target}: ${
								error instanceof Error ? error.message : String(error)
							}`,
						}
					}
				},
			})
		})

		log.info(`ready for ${directory}`)
		return () => registration.dispose()
	},
})
