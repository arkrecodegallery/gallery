import { describe, expect, it } from "vitest";
import { computeBarProgress, dotState } from "./bondProgress";

describe("computeBarProgress", () => {
	it("returns -1/0 when nothing is playing yet", () => {
		expect(computeBarProgress([{ animationName: "a", loop: true }], undefined)).toEqual({
			activeBarIndex: -1,
			progress: 0,
		});
	});

	it("finds the active bar by matching animation name", () => {
		const bars = [
			{ animationName: "01_in", loop: false },
			{ animationName: "02_in", loop: false },
			{ animationName: "10_idle", loop: true },
		];

		const result = computeBarProgress(bars, {
			animationName: "02_in",
			trackTime: 0,
			duration: 1,
		});

		expect(result.activeBarIndex).toBe(1);
	});

	it("returns -1 when the current track name isn't in bars", () => {
		const bars = [{ animationName: "10_idle", loop: true }];

		const result = computeBarProgress(bars, {
			animationName: "not_a_bar",
			trackTime: 0,
			duration: 1,
		});

		expect(result.activeBarIndex).toBe(-1);
	});

	it("computes a plain ratio when trackTime is within duration", () => {
		const bars = [{ animationName: "10_idle", loop: true }];

		const result = computeBarProgress(bars, {
			animationName: "10_idle",
			trackTime: 1,
			duration: 4,
		});

		expect(result.progress).toBe(0.25);
	});

	it("wraps trackTime past duration via modulo, since looping animations keep accumulating elapsed time", () => {
		const bars = [{ animationName: "10_idle", loop: true }];

		const result = computeBarProgress(bars, {
			animationName: "10_idle",
			trackTime: 9,
			duration: 4,
		});

		expect(result.progress).toBe(0.25);
	});

	it("resets to 0 exactly at the loop boundary rather than reporting 1", () => {
		const bars = [{ animationName: "10_idle", loop: true }];

		const result = computeBarProgress(bars, {
			animationName: "10_idle",
			trackTime: 4,
			duration: 4,
		});

		expect(result.progress).toBe(0);
	});

	it("guards against divide-by-zero for a zero-length animation", () => {
		const bars = [{ animationName: "10_idle", loop: true }];

		const result = computeBarProgress(bars, {
			animationName: "10_idle",
			trackTime: 0,
			duration: 0,
		});

		expect(result.progress).toBe(0);
	});
});

describe("dotState", () => {
	it("marks positions before current as complete", () => {
		expect(dotState(0, 2)).toBe("complete");
		expect(dotState(1, 2)).toBe("complete");
	});

	it("marks the current position as current", () => {
		expect(dotState(2, 2)).toBe("current");
		expect(dotState(0, 0)).toBe("current");
	});

	it("marks positions after current as upcoming", () => {
		expect(dotState(3, 2)).toBe("upcoming");
		expect(dotState(1, 0)).toBe("upcoming");
	});
});
