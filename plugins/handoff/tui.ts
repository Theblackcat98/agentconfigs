/**
 * Handoff TUI plugin (OpenCode V2)
 *
 * The server half creates and seeds the new session. This half is what makes
 * the user actually land in it: a server plugin cannot change the active
 * session, only a CLI plugin can, through context.ui.router.navigate.
 *
 * Two paths, because RPC event subscriptions are live-only:
 *   - `prepared` event: the normal path, fires while this TUI is attached.
 *   - listPending: recovery for a handoff this TUI was not around for.
 *
 * Durable storage records the last session it moved to, so restarting the TUI
 * never yanks the user back into an old handoff.
 *
 * NOTE: this plugin deliberately registers no keymap layer or palette command.
 * `context.keymap` only exposes `layer()`, which its own type describes as
 * "Creates a reactive keymap layer owned by the calling component" — it reads a
 * Solid context (`Keymap.Provider`). A plugin's `setup()` is not a component and
 * has no such owner, so calling it throws "Keymap.Provider is missing" and
 * takes the whole plugin down with it. Do not re-add it here; an optional
 * feature must never be able to fail setup.
 */

import { Plugin } from "@opencode/plugin/tui"
import { Handoff, type Prepared } from "./rpc.js"

function isPrepared(value: unknown): value is Prepared {
	if (!value || typeof value !== "object") return false
	const record = value as Record<string, unknown>
	return typeof record.sessionID === "string" && record.sessionID.length > 0 && typeof record.title === "string"
}

export default Plugin.define({
	id: "handoff.tui",
	async setup(context) {
		const handoff = context.client.rpc(Handoff)
		const directory = context.location?.directory
		const [seen, setSeen] = context.storage.store("lastHandoff", { initial: { sessionID: "" } })

		const newest = async (): Promise<Prepared | undefined> => {
			try {
				const result = await handoff.listPending({})
				const entries = Array.isArray(result?.data?.entries) ? result.data.entries : []
				return [...entries].reverse().find(isPrepared)
			} catch (error) {
				console.error(`[handoff.tui] listPending failed:`, error)
				return undefined
			}
		}

		const go = async (prepared: Prepared, why: string) => {
			try {
				context.ui.router.navigate({ type: "session", sessionID: prepared.sessionID })
				await setSeen({ sessionID: prepared.sessionID })
				context.ui.toast.show({
					title: "Handoff",
					message:
						why === "recovered"
							? `Resuming "${prepared.title}"`
							: `Continuing in "${prepared.title}"`,
					variant: "success",
					sessionID: prepared.sessionID,
				})
			} catch (error) {
				// The session exists either way. If the TUI refuses to navigate,
				// tell the user where it is instead of failing silently.
				console.error(`[handoff.tui] navigate failed:`, error)
				context.ui.toast.show({
					title: "Handoff",
					message: `Could not switch automatically. Open "${prepared.title}" from your session list.`,
					variant: "warning",
					sessionID: prepared.sessionID,
				})
			}
		}

		const unsubscribe = handoff.events.on("prepared", (event) => {
			// Ignore handoffs prepared for a different project or window.
			const eventDirectory = (event as { location?: { directory?: string } }).location?.directory
			if (directory && eventDirectory && eventDirectory !== directory) return
			if (!isPrepared(event.data)) return
			void go(event.data, "event")
		})

		// Recovery: catch anything prepared before this TUI subscribed. Never
		// switch into the session the user is already sitting in.
		void (async () => {
			const prepared = await newest()
			if (!prepared || prepared.sessionID === seen.sessionID) return
			const current = context.ui.router.current()
			if (current.type === "session" && current.sessionID === prepared.sessionID) return
			await go(prepared, "recovered")
		})()

		return () => unsubscribe()
	},
})