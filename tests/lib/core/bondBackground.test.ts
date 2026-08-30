import { describe, expect, it } from "vitest";
import { isKnownBackgroundClip, resolveBackgroundAnimation } from "$lib/core/bondBackground";
import type { BondRule } from "$lib/core/bondRules";

describe("resolveBackgroundAnimation", () => {
	it("returns undefined when there's no rule and no default background clip", () => {
		expect(
			resolveBackgroundAnimation({}, undefined, undefined, undefined, false, false)
		).toBeUndefined();
	});

	it("returns the default background clip when there's no rule", () => {
		expect(
			resolveBackgroundAnimation({}, "90_bg", "20_loop_ani", undefined, false, false)
		).toBe("90_bg");
	});

	it("ignores the current main animation when there's no rule", () => {
		expect(
			resolveBackgroundAnimation({}, "90_bg", "30_finish_ani", "90_bg", false, false)
		).toBe("90_bg");
	});

	it("starts at the rule's base clip once active", () => {
		const rule: BondRule = { background: { base: "90_BG_Start" } };
		expect(
			resolveBackgroundAnimation(rule, undefined, "10_idle_ani", undefined, false, false)
		).toBe("90_BG_Start");
	});

	it("switches to the mapped background when its trigger animation starts", () => {
		const rule: BondRule = {
			background: {
				base: "90_BG_Start",
				progress: {
					"90_BG_Open": "20_Loop_ani",
					"91_BG_Fast": "23_Loop_ani",
					"92_BG_Stop": "30_Finish_ani",
				},
			},
		};
		expect(
			resolveBackgroundAnimation(rule, undefined, "20_Loop_ani", "90_BG_Start", false, false)
		).toBe("90_BG_Open");
	});

	it("stays on the active background when the current animation matches no trigger", () => {
		const rule: BondRule = {
			background: { base: "90_BG_Start", progress: { "90_BG_Open": "20_Loop_ani" } },
		};
		expect(
			resolveBackgroundAnimation(rule, undefined, "21_Loop_ani2", "90_BG_Open", false, false)
		).toBe("90_BG_Open");
	});

	it("stays latched once a trigger clip has finished and a later clip is playing", () => {
		const rule: BondRule = {
			background: { base: "90_BG_Start", progress: { "90_BG_Open": "20_Loop_ani" } },
		};
		expect(
			resolveBackgroundAnimation(rule, undefined, "21_Loop_ani2", "90_BG_Open", false, false)
		).toBe("90_BG_Open");
	});

	it("resets to the base clip once the sequence cycles back to stage 0", () => {
		const rule: BondRule = {
			background: {
				base: "90_BG_Start",
				progress: { "92_BG_Stop": "30_Finish_ani" },
			},
		};
		expect(
			resolveBackgroundAnimation(rule, undefined, "00_Idle_ani", "92_BG_Stop", false, true)
		).toBe("90_BG_Start");
	});

	it("is always undefined when suppressed, regardless of rule or default", () => {
		const rule: BondRule = { background: { base: "90_BG_Start" } };
		expect(
			resolveBackgroundAnimation(rule, "90_bg", "20_Loop_ani", "90_BG_Open", true, false)
		).toBeUndefined();
		expect(
			resolveBackgroundAnimation({}, "90_bg", "20_Loop_ani", "90_bg", true, false)
		).toBeUndefined();
	});
});

describe("isKnownBackgroundClip", () => {
	const skeletonData = { animations: [{ name: "90_bg" }, { name: "20_loop_ani" }] };

	it("is true when the name exists on the skeleton", () => {
		expect(isKnownBackgroundClip("90_bg", skeletonData)).toBe(true);
	});

	it("regression: a typo'd rule name doesn't crash, just resolves to unknown", () => {
		expect(isKnownBackgroundClip("90_BG_Typo", skeletonData)).toBe(false);
	});

	it("is false when there's no name to check", () => {
		expect(isKnownBackgroundClip(undefined, skeletonData)).toBe(false);
	});

	it("regression: a skeleton with no animations at all doesn't crash", () => {
		expect(isKnownBackgroundClip("90_bg", undefined)).toBe(false);
	});
});
