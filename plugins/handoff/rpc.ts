/**
 * Shared RPC contract between the handoff server plugin and its TUI half.
 *
 * The server plugin owns session creation and seeding; it announces the result
 * here so the terminal plugin can move the user into the new session. Only the
 * TUI can change the active route and only the server can create a session, so
 * this contract is the join point between the two halves.
 *
 * Verified against @opencode/plugin 2.0.20: Rpc.Definition requires both
 * `methods` and `events`, and event data must be an object.
 */

import { Rpc } from "@opencode/plugin/rpc"

const PreparedShape = {
	type: "object",
	properties: {
		sessionID: { type: "string", description: "The newly seeded session" },
		title: { type: "string", description: "Title of the newly seeded session" },
		fromSessionID: { type: "string", description: "Session the handoff came from" },
		at: { type: "number", description: "Epoch milliseconds when the handoff was prepared" },
	},
	required: ["sessionID", "title", "fromSessionID", "at"],
	additionalProperties: false,
} as const

export const Handoff = Rpc.define({
	id: "handoff",
	methods: {
		/**
		 * Recovery path for a handoff this TUI missed. RPC event subscriptions
		 * are live-only, so a TUI that attaches late never sees `prepared`, and a
		 * TUI that was closed never sees it either. This is a plain idempotent
		 * read: it never deletes, so several terminals may poll it safely.
		 */
		listPending: {
			input: { type: "object", properties: {}, additionalProperties: false },
			output: {
				type: "object",
				properties: {
					entries: {
						type: "array",
						description: "Recent handoffs in this location, oldest first",
						items: PreparedShape,
					},
				},
				required: ["entries"],
				additionalProperties: false,
			},
		},
	},
	events: {
		prepared: { schema: PreparedShape },
	},
})

export type Prepared = {
	readonly sessionID: string
	readonly title: string
	readonly fromSessionID: string
	readonly at: number
}
