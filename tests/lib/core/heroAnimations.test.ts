import { describe, expect, it } from "vitest";
import type { Animation } from "@esotericsoftware/spine-core";
import { getEligibleAnimationNames } from "$lib/core/heroAnimations";
import { findIdleAnimationName, POSSIBLE_IDLE_NAMES } from "$lib/core/idleAnimation";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

describe("getEligibleAnimationNames", () => {
	it("excludes the detected idle animation and anything prefixed 90 or above", () => {
		const names = anims(["00_Idle", "04_Touch", "20_Loop", "90_BG"]);
		expect(getEligibleAnimationNames(names, "H001")).toEqual(["04_Touch", "20_Loop"]);
	});

	it("keeps a real Touch clip, unlike Animate's bond-tuned mode taxonomy which would drop it", () => {
		const names = anims(["00_Idle", "04_Touch"]);
		expect(getEligibleAnimationNames(names, "H001")).toContain("04_Touch");
	});

	it("returns everything under 90 when no idle animation is detected", () => {
		const names = anims(["10_Loop", "20_Loop"]);
		expect(getEligibleAnimationNames(names, "H001")).toEqual(["10_Loop", "20_Loop"]);
	});
});

describe("findIdleAnimationName", () => {
	it("picks the first matching candidate in priority order, not list order", () => {
		const names = anims(["01_Idle_ani", "00_Idle"]);
		expect(findIdleAnimationName(names)).toBe(POSSIBLE_IDLE_NAMES[0]);
	});

	it("returns undefined when no candidate matches", () => {
		expect(findIdleAnimationName(anims(["20_Loop"]))).toBeUndefined();
	});
});
