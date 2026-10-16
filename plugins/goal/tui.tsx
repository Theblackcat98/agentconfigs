/**
 * Goal TUI plugin (OpenCode V2)
 *
 * The server half verifies goals and announces transitions over RPC. This half
 * renders them: sidebar goal card, prompt status dot, detail panel, and a
 * route. Toasts and attention notifications fire on verification.
 *
 * Recovery: RPC event subscriptions are live-only, so setup also polls
 * listGoals once for goals this TUI was not around for.
 *
 * NOTE: this file deliberately calls no keymap API in setup(). `keymap.layer`
 * reads a Solid context (Keymap.Provider); setup() is not a component and has
 * no such owner, so calling it there throws and takes the whole plugin down.
 * Palette/keyboard commands register inside slot/route components (see gap 6).
 */

import { For, Show } from "solid-js"
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { Goal, type GoalInfo } from "./rpc.js"

export function isGoalInfo(value: unknown): value is GoalInfo {
	if (!value || typeof value !== "object") return false
	const record = value as Record<string, unknown>
	return (
		typeof record.sessionID === "string" &&
		typeof record.objective === "string" &&
		typeof record.checkCmd === "string" &&
		typeof record.status === "string" &&
		typeof record.round === "number" &&
		typeof record.maxRounds === "number" &&
		typeof record.createdAt === "number"
	)
}

export function entriesOf(result: unknown): GoalInfo[] {
	if (!result || typeof result !== "object") return []
	const record = result as Record<string, unknown>
	const holder = record.entries ?? (record.data as Record<string, unknown> | undefined)?.entries
	if (!Array.isArray(holder)) return []
	return holder.filter(isGoalInfo)
}

export default Plugin.define({
	id: "goal.tui",
	async setup(context) {
		const goal = context.client.rpc(Goal)
		const directory = context.location?.directory
		const [lastSeen, setLastSeen] = context.storage.store("lastGoal", {
			initial: { sessionID: "", status: "", round: -1 },
		})
		const [live, setLive] = context.storage.memory("goals", {
			initial: { entries: [] as GoalInfo[] },
		})

		const sameDirectory = (event: { location?: { directory?: string } }): boolean => {
			const eventDirectory = event.location?.directory
			return !directory || !eventDirectory || eventDirectory === directory
		}

		const upsert = (info: GoalInfo): void => {
			setLive((draft) => {
				const index = draft.entries.findIndex((entry) => entry.sessionID === info.sessionID)
				if (index === -1) draft.entries.push({ ...info })
				else draft.entries[index] = { ...info }
			})
		}

		const refresh = async (): Promise<void> => {
			try {
				const result = await goal.listGoals({})
				for (const info of entriesOf(result)) upsert(info)
			} catch (error) {
				console.error(`[goal.tui] listGoals failed:`, error)
			}
		}

		/** Goal for a session, falling back to any active goal. */
		const forSession = (sessionID?: string): GoalInfo | undefined => {
			if (sessionID) {
				const hit = live.entries.find((entry) => entry.sessionID === sessionID)
				if (hit) return hit
			}
			return live.entries.find((entry) => entry.status === "active")
		}

		const unsubscribes: Array<() => void> = [
			goal.events.on("updated", (event) => {
				if (!sameDirectory(event) || !isGoalInfo(event.data)) return
				upsert(event.data)
			}),
			goal.events.on("verified", (event) => {
				if (!sameDirectory(event) || !isGoalInfo(event.data)) return
				const info = event.data
				upsert(info)
				if (lastSeen.sessionID === info.sessionID && lastSeen.status === info.status && lastSeen.round === info.round) return
				void setLastSeen((draft) => {
					draft.sessionID = info.sessionID
					draft.status = info.status
					draft.round = info.round
				})
				context.ui.toast.show({
					title: "Goal verified",
					message: info.objective,
					variant: "success",
					sessionID: info.sessionID,
				})
				void context.attention.notify({ title: "Goal verified", message: info.objective }).catch((error) => {
					console.error(`[goal.tui] notify failed:`, error)
				})
			}),
			goal.events.on("blocked", (event) => {
				if (!sameDirectory(event) || !isGoalInfo(event.data)) return
				upsert(event.data)
				context.ui.toast.show({
					title: `Goal ${event.data.status}`,
					message: event.data.objective,
					variant: "warning",
					sessionID: event.data.sessionID,
				})
			}),
			// Keep the cards fresh as runs end; the next listGoals is cheap
			// and these events are infrequent.
			context.data.on("session.execution.succeeded", () => void refresh()),
			context.data.on("session.execution.failed", () => void refresh()),
			context.data.on("session.execution.interrupted", () => void refresh()),
		]

		// Recovery: catch goals tracked before this TUI subscribed.
		void refresh()

		const GoalCard = (props: { sessionID: string }) => {
			const ctx = usePlugin()
			const info = () => forSession(props.sessionID)
			return (
				<Show when={info()}>
					{(current: () => GoalInfo) => (
						<box flexDirection="column">
							<text fg={ctx.theme.text.base}>
								GOAL {current().status} {current().round}/{current().maxRounds}
							</text>
							<text fg={ctx.theme.text.muted}>{current().objective}</text>
						</box>
					)}
				</Show>
			)
		}

		const GoalDot = (props: { sessionID?: string }) => {
			const ctx = usePlugin()
			const info = () => (props.sessionID ? forSession(props.sessionID) : forSession(undefined))
			return (
				<Show when={info() && info()?.status === "active"}>
					<text fg={ctx.theme.text.feedback.success.base}>GOAL {info()?.round}/{info()?.maxRounds}</text>
				</Show>
			)
		}

		const GoalPanel = (props: { name: string; sessionID: string }) => {
			const ctx = usePlugin()
			const info = () => forSession(props.sessionID)
			return (
				<Show when={props.name === "goal.detail" && info()}>
					{(current: () => GoalInfo) => (
						<box flexDirection="column">
							<text fg={ctx.theme.text.base}>Goal detail</text>
							<text fg={ctx.theme.text.muted}>objective: {current().objective}</text>
							<text fg={ctx.theme.text.muted}>
								status: {current().status} round: {current().round}/{current().maxRounds}
							</text>
							<text fg={ctx.theme.text.muted}>check: {current().checkCmd || "(LLM judge)"}</text>
						</box>
					)}
				</Show>
			)
		}

		const GoalRoute = () => {
			const ctx = usePlugin()
			return (
				<box flexDirection="column">
					<text fg={ctx.theme.text.base}>Goals</text>
					<For each={live.entries}>
						{(entry) => (
							<text fg={ctx.theme.text.muted}>
								{entry.status} {entry.round}/{entry.maxRounds} {entry.objective}
							</text>
						)}
					</For>
				</box>
			)
		}

		// Palette commands live here, not in setup(): keymap.layer() needs the
		// Solid owner this mounted component provides. The app slot is always
		// mounted, so the commands are always reachable.
		const GoalCommands = () => {
			const ctx = usePlugin()
			ctx.keymap.layer(() => ({
				mode: "global",
				commands: [
					{
						id: "goal.status",
						title: "Show goal status",
						group: "Goal",
						palette: true,
						run: () => ctx.ui.router.navigate({ type: "plugin", name: "goal" }),
					},
					{
						id: "goal.stop",
						title: "Stop active goal",
						group: "Goal",
						palette: true,
						run: () => {
							void (async () => {
								const current = ctx.ui.router.current()
								let sessionID = current.type === "session" ? current.sessionID : forSession(undefined)?.sessionID
								if (!sessionID) {
									const listed = await goal.listGoals({}).catch(() => undefined)
									const actives = entriesOf(listed).filter((entry) => entry.status === "active")
									if (!actives.length) {
										ctx.ui.toast.show({ title: "Goal", message: "No active goal.", variant: "info" })
										return
									}
									const picked = await ctx.ui.dialog.select({
										title: "Stop goal",
										options: actives.map((entry) => ({
											title: entry.objective,
											value: entry.sessionID,
											description: `round ${entry.round}/${entry.maxRounds}`,
										})),
									})
									if (!picked) return
									sessionID = picked
								} else {
									const info = forSession(sessionID)
									const confirmed = await ctx.ui.dialog.confirm({
										title: "Stop goal?",
										message: info ? `Stop "${info.objective}"?` : "Stop the active goal in this session?",
										label: { confirm: "Stop", cancel: "Cancel" },
									})
									if (!confirmed) return
								}
								try {
									await goal.stopGoal({ sessionID })
									ctx.ui.toast.show({ title: "Goal stopped", message: "Goal mode ended.", variant: "info", sessionID })
								} catch (error) {
									ctx.ui.toast.show({
										title: "Goal",
										message: `Could not stop the goal: ${error instanceof Error ? error.message : String(error)}`,
										variant: "error",
										sessionID,
									})
								}
							})()
						},
					},
				],
			}))
			return null
		}

		const unregisterSidebar = context.ui.slot({
			append: "sidebar.content",
			render: (input) => <GoalCard sessionID={input.sessionID} />,
		})
		const unregisterDot = context.ui.slot({
			append: "prompt.footer.status",
			render: (input) => <GoalDot sessionID={input.sessionID} />,
		})
		const unregisterPanel = context.ui.slot({
			append: "session.panel",
			render: (panel) => <GoalPanel name={panel.name} sessionID={panel.sessionID} />,
		})
		const unregisterRoute = context.ui.router.register({
			name: "goal",
			render: () => <GoalRoute />,
		})
		const unregisterCommands = context.ui.slot({
			append: "app",
			render: () => <GoalCommands />,
		})

		return () => {
			for (const stop of unsubscribes) {
				try {
					stop()
				} catch (error) {
					console.error(`[goal.tui] unsubscribe failed:`, error)
				}
			}
			unregisterSidebar()
			unregisterDot()
			unregisterPanel()
			unregisterRoute()
			unregisterCommands()
		}
	},
})
