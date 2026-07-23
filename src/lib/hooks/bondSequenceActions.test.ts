import { describe, expect, it, beforeEach } from "vitest";
import type { Animation, SkeletonData } from "@esotericsoftware/spine-core";
import { store } from "./state.svelte";
import { BondViewState } from "./bondViewState.svelte";
import { BondSequenceActions } from "./bondSequenceActions";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names) } as SkeletonData;
}

describe("BondSequenceActions", () => {
	beforeEach(() => {
		store.skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
	});

	it("advanceStage advances the sequencer and syncs stage meta onto the reactive state", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		expect(actions.startAutoPlay("H999")).toBe(true);
		expect(state.stageIndex).toBe(0);

		expect(actions.advanceStage("H999")).toBe(true);
		expect(state.stageIndex).toBe(1);
		expect(state.stageCount).toBe(3);
	});

	it("advanceStage/startAutoPlay return false when there's no skeleton loaded", () => {
		store.skeletonData = undefined;
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		expect(actions.advanceStage("H999")).toBe(false);
		expect(actions.startAutoPlay("H999")).toBe(false);
	});

	it("advanceStage/startAutoPlay return false for a hero whose bond rule disables sequencing", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		// H003 is marked { disable: true } in bondRules.ts
		expect(actions.advanceStage("H003")).toBe(false);
		expect(actions.startAutoPlay("H003")).toBe(false);
	});

	it("advanceStills wraps the stills index around the image count", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		actions.advanceStills(2);
		expect(state.stillsIndex).toBe(1);
		actions.advanceStills(2);
		expect(state.stillsIndex).toBe(0);
	});

	it("getAnimation returns the manual list for a disabled hero", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		const skeleton = { setToSetupPose: () => {} } as any;
		const animationState = { clearTracks: () => {} } as any;

		const result = actions.getAnimation(
			store.skeletonData!,
			animationState,
			skeleton,
			"H003",
			() => [{ animationName: "manual", trackIndex: 0, loop: true }]
		);

		expect(result).toEqual([
			{ animationName: "manual", trackIndex: 0, loop: true },
		]);
	});

	it("getAnimation returns the manual list once manualOverride is set", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		const skeleton = { setToSetupPose: () => {} } as any;
		const animationState = { clearTracks: () => {} } as any;

		actions.getAnimation(store.skeletonData!, animationState, skeleton, "H999", () => []);
		state.sequencer.manualOverride = true;

		const result = actions.getAnimation(
			store.skeletonData!,
			animationState,
			skeleton,
			"H999",
			() => [{ animationName: "manual", trackIndex: 0, loop: true }]
		);

		expect(result).toEqual([
			{ animationName: "manual", trackIndex: 0, loop: true },
		]);
	});

	it("getAnimation otherwise maps the sequencer's current sequence onto track 0", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		const skeleton = { setToSetupPose: () => {} } as any;
		const animationState = { clearTracks: () => {} } as any;

		const result = actions.getAnimation(
			store.skeletonData!,
			animationState,
			skeleton,
			"H999",
			() => []
		);

		expect(result).toEqual([
			{ trackIndex: 0, animationName: "00_idle", loop: true },
		]);
	});
});
