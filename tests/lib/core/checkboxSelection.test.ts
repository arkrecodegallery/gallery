import { describe, expect, it } from "vitest";
import {
	applyCheckboxSelection,
	isAnimationChecked,
	reconcileSingleCheckbox,
} from "$lib/core/checkboxSelection";

describe("applyCheckboxSelection", () => {
	it("exclusive check replaces any prior selection with just the new name", () => {
		const result = applyCheckboxSelection({ old: 0 }, "new", true, false);
		expect(result).toEqual({ new: 0 });
	});

	it("exclusive uncheck always clears to {}, regardless of prior state", () => {
		expect(applyCheckboxSelection({ a: 0, b: 1 }, "a", false, false)).toEqual({});
		expect(applyCheckboxSelection({}, "a", false, false)).toEqual({});
	});

	it("additive check on an empty set starts at index 0", () => {
		const result = applyCheckboxSelection({}, "a", true, true);
		expect(result).toEqual({ a: 0 });
	});

	it("additive check appends after existing entries without disturbing their indices", () => {
		const result = applyCheckboxSelection({ a: 0, b: 1 }, "c", true, true);
		expect(result).toEqual({ a: 0, b: 1, c: 2 });
	});

	it("additive uncheck removes the key and reindexes the remaining keys sequentially", () => {
		const result = applyCheckboxSelection({ a: 0, b: 1, c: 2 }, "b", false, true);
		expect(result).toEqual({ a: 0, c: 1 });
	});

	it("additive uncheck of a name that isn't present is a harmless no-op-ish call", () => {
		const result = applyCheckboxSelection({ a: 0, b: 1 }, "missing", false, true);
		expect(result).toEqual({ a: 0, b: 1 });
	});

	it("regression: additive re-check of an already-checked name bumps it to the end instead of leaving it alone", () => {
		// current behavior of `next[name] = Object.keys(next).length`, which
		// counts the key being re-checked itself - surprising, but pinned
		// down here since it's not reachable through the checkbox UI (a
		// checked box's next click is always an uncheck).
		const result = applyCheckboxSelection({ a: 0, b: 1 }, "a", true, true);
		expect(result).toEqual({ a: 2, b: 1 });
	});
});

describe("reconcileSingleCheckbox", () => {
	it("bond-style (clearOnUndefined: false): undefined playingName returns the same reference unchanged", () => {
		const current = { manual: 0 };
		const result = reconcileSingleCheckbox(current, undefined, false);
		expect(result).toBe(current);
	});

	it("hero/skill-style (clearOnUndefined: true): undefined playingName clears a non-empty set", () => {
		const result = reconcileSingleCheckbox({ a: 0 }, undefined, true);
		expect(result).toEqual({});
	});

	it("hero/skill-style: undefined playingName on an already-empty set returns the same reference", () => {
		const current = {};
		const result = reconcileSingleCheckbox(current, undefined, true);
		expect(result).toBe(current);
	});

	it("playingName matching the sole existing key returns the same reference (no-op)", () => {
		const current = { idle: 0 };
		const result = reconcileSingleCheckbox(current, "idle", false);
		expect(result).toBe(current);
	});

	it("playingName differing from the sole existing key takes over as the sole checked box", () => {
		const result = reconcileSingleCheckbox({ old: 0 }, "new", false);
		expect(result).toEqual({ new: 0 });
	});

	it("a leftover multi-key additive selection collapses to a single checked box once something else takes over", () => {
		const result = reconcileSingleCheckbox({ a: 0, b: 1, c: 2 }, "b", true);
		expect(result).toEqual({ b: 0 });
	});
});

describe("isAnimationChecked", () => {
	it("regression: the active bond background clip shows checked without being in `animations`", () => {
		expect(isAnimationChecked("90_BG_Open", {}, ["90_BG_Open"])).toBe(true);
	});

	it("a name present in `animations` shows checked regardless of the background clip", () => {
		expect(isAnimationChecked("20_loop_ani", { "20_loop_ani": 0 }, ["90_BG_Open"])).toBe(
			true
		);
	});

	it("a name that is neither selected nor the active background shows unchecked", () => {
		expect(isAnimationChecked("30_finish_ani", { "20_loop_ani": 0 }, ["90_BG_Open"])).toBe(
			false
		);
	});

	it("no active background (suppressed or none) never marks anything checked on its behalf", () => {
		expect(isAnimationChecked("90_BG_Open", {}, [])).toBe(false);
		expect(isAnimationChecked("90_BG_Open", {})).toBe(false);
	});

	it("regression: skill view's multiple bg clips (90_BG + 90_Sparkle) both show checked", () => {
		expect(isAnimationChecked("90_BG", {}, ["90_BG", "90_Sparkle"])).toBe(true);
		expect(isAnimationChecked("90_Sparkle", {}, ["90_BG", "90_Sparkle"])).toBe(true);
		expect(isAnimationChecked("04_Touch", {}, ["90_BG", "90_Sparkle"])).toBe(false);
	});
});
