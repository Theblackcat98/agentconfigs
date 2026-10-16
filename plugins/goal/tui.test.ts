import { describe, expect, test } from "bun:test"
import { entriesOf, isGoalInfo } from "./tui.js"

const info = {
	sessionID: "s",
	objective: "o",
	checkCmd: "",
	status: "active",
	round: 1,
	maxRounds: 8,
	createdAt: 1,
}

describe("goal tui guards", () => {
	test("isGoalInfo accepts RPC payloads and rejects junk", () => {
		expect(isGoalInfo(info)).toBe(true)
		expect(isGoalInfo({ ...info, round: "1" })).toBe(false)
		expect(isGoalInfo(undefined)).toBe(false)
	})

	test("entriesOf reads both result shapes", () => {
		expect(entriesOf({ entries: [info] })).toEqual([info])
		expect(entriesOf({ data: { entries: [info] } })).toEqual([info])
		expect(entriesOf({ data: {} })).toEqual([])
		expect(entriesOf(undefined)).toEqual([])
	})
})
