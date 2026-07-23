import { describe, expect, it } from "vitest";
import type { ModelState } from "$lib/hooks/modelState.svelte";
import { computeMeterData } from "./progressMeterData";

function baseModelState(): any {
	return {
		getAbsoluteEntry: () => ({ id: "H999" }),
		cycleIndex: 0,
		skillBarProgress: 0,
		bond: {
			stillsIndex: 0,
			manualOverride: false,
			stageCount: 0,
			stageIndex: 0,
			sequenceBars: [],
			activeBarIndex: -1,
			barProgress: 0,
		},
		heroAnimation: {
			eligibleNames: [],
			playingIndex: -1,
			selectedIndex: 0,
			barProgress: 0,
		},
	};
}

describe("computeMeterData", () => {
	it("collection view is always plain", () => {
		const data = computeMeterData("collection", baseModelState() as ModelState);
		expect(data.kind).toBe("plain");
	});

	it("hero view with no eligible animations is plain", () => {
		const data = computeMeterData("hero", baseModelState() as ModelState);
		expect(data.kind).toBe("plain");
	});

	it("hero view reports the selection cursor separately from the playing dot", () => {
		const state = baseModelState();
		state.heroAnimation = {
			eligibleNames: ["04_Touch", "20_Loop"],
			playingIndex: 0,
			selectedIndex: 1,
			barProgress: 0.5,
		};

		const data = computeMeterData("hero", state as ModelState);

		expect(data.kind).toBe("bars");
		expect(data.dotCount).toBe(2);
		expect(data.currentDot).toBe(0);
		expect(data.selectedDot).toBe(1);
		expect(data.barProgress).toBe(0.5);
	});

	it("skill view has no dot row, just a progress bar reflecting skillBarProgress", () => {
		const state = baseModelState();
		state.skillBarProgress = 0.75;

		const data = computeMeterData("skill", state as ModelState);

		expect(data.kind).toBe("bars");
		expect(data.dotCount).toBe(0);
		expect(data.barProgress).toBe(0.75);
	});

	it("bond view with a disabled rule is plain regardless of stageCount", () => {
		const state = baseModelState();
		state.getAbsoluteEntry = () => ({
			id: "H003", // disabled in bondRules.ts
			bond: [{ kind: "animated" }],
		});
		state.bond.stageCount = 3;

		const data = computeMeterData("bond", state as ModelState);

		expect(data.kind).toBe("plain");
	});

	it("bond view with an active animated presentation reports its sequence bars", () => {
		const state = baseModelState();
		state.getAbsoluteEntry = () => ({
			id: "H999",
			bond: [{ kind: "animated" }],
		});
		state.bond.stageCount = 3;
		state.bond.stageIndex = 1;
		state.bond.sequenceBars = [{ animationName: "20_loop", loop: true }];
		state.bond.activeBarIndex = 0;
		state.bond.barProgress = 0.25;

		const data = computeMeterData("bond", state as ModelState);

		expect(data.kind).toBe("bars");
		expect(data.dotCount).toBe(3);
		expect(data.currentDot).toBe(1);
		expect(data.bars).toEqual([{ animationName: "20_loop", loop: true }]);
		expect(data.barProgress).toBe(0.25);
	});

	it("bond view with an active stills presentation reports one dot per image", () => {
		const state = baseModelState();
		state.getAbsoluteEntry = () => ({
			id: "H999",
			bond: [{ kind: "stills", images: ["a.png", "b.png", "c.png"] }],
		});
		state.bond.stillsIndex = 1;

		const data = computeMeterData("bond", state as ModelState);

		expect(data.kind).toBe("stills");
		expect(data.dotCount).toBe(3);
		expect(data.currentDot).toBe(1);
		expect(data.barProgress).toBe(1);
	});
});
