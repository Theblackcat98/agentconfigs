/**
 * Shared RPC contract between the goal server plugin and its TUI half.
 *
 * The server owns goal state (verify/settle) and announces transitions here;
 * the TUI renders them (sidebar card, status dot, detail panel) and offers
 * `stopGoal` as a recovery path. Only the server can settle a goal, and only
 * a CLI plugin can surface it, so this contract is the join point.
 *
 * Verified against @opencode/plugin 2.0.26: Rpc.Definition requires both
 * `methods` and `events`, and event data must be an object.
 */

import { Rpc } from "@opencode/plugin/rpc"

const GoalInfoShape = {
	type: "object",
	properties: {
		sessionID: { type: "string", description: "Session owning the goal" },
		objective: { type: "string", description: "Goal objective" },
		checkCmd: { type: "string", description: "Deterministic check command, or empty when the LLM judge verifies" },
		status: { type: "string", description: "active | done | gave_up | aborted | stopped" },
		round: { type: "integer", description: "Verification rounds used so far" },
		maxRounds: { type: "integer", description: "Round budget including subagent turns" },
		createdAt: { type: "number", description: "Epoch milliseconds when the goal started" },
	},
	required: ["sessionID", "objective", "checkCmd", "status", "round", "maxRounds", "createdAt"],
	additionalProperties: false,
} as const

export const Goal = Rpc.define({
	id: "goal",
	methods: {
		/**
		 * Recovery path for goal state this TUI missed. RPC event
		 * subscriptions are live-only, so a TUI that attaches late never sees
		 * `updated`/`verified`/`blocked`. Plain idempotent read; several
		 * terminals may poll it safely.
		 */
		listGoals: {
			input: { type: "object", properties: {}, additionalProperties: false },
			output: {
				type: "object",
				properties: {
					entries: {
						type: "array",
						description: "Tracked goals, oldest first",
						items: GoalInfoShape,
					},
				},
				required: ["entries"],
				additionalProperties: false,
			},
		},
		/** Stop the goal in a session. Recovery path for the TUI stop command. */
		stopGoal: {
			input: {
				type: "object",
				properties: {
					sessionID: { type: "string", description: "Session whose goal should stop" },
				},
				required: ["sessionID"],
				additionalProperties: false,
			},
			output: {
				type: "object",
				properties: {
					stopped: { type: "boolean", description: "True when a goal was stopped" },
				},
				required: ["stopped"],
				additionalProperties: false,
			},
			errors: {
				not_found: {
					type: "object",
					properties: {
						sessionID: { type: "string" },
					},
					required: ["sessionID"],
					additionalProperties: false,
				},
			},
		},
	},
	events: {
		/** Emitted on verification progress (round used, still active). */
		updated: { schema: GoalInfoShape },
		/** Emitted when the goal verifies complete. */
		verified: { schema: GoalInfoShape },
		/** Emitted when the goal ends without verifying (gave_up/aborted/stopped). */
		blocked: { schema: GoalInfoShape },
	},
})

export type GoalInfo = {
	readonly sessionID: string
	readonly objective: string
	readonly checkCmd: string
	readonly status: string
	readonly round: number
	readonly maxRounds: number
	readonly createdAt: number
}
