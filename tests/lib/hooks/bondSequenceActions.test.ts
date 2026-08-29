import { describe, expect, it } from "vitest";
import type { Animation, SkeletonData } from "@esotericsoftware/spine-core";
import { BondViewState } from "$lib/hooks/bondViewState.svelte";
import { BondSequenceActions } from "$lib/hooks/bondSequenceActions";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names) } as SkeletonData;
}

describe("BondSequenceActions", () => {
	it("advanceStage advances the sequencer and syncs stage meta onto the reactive state", () => {
		const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		expect(actions.startAutoPlay(skeletonData, "H999")).toBe(true);
		expect(state.stageIndex).toBe(0);

		expect(actions.advanceStage(skeletonData, "H999")).toBe(true);
		expect(state.stageIndex).toBe(1);
		expect(state.stageCount).toBe(3);
	});

	it("advanceStage/startAutoPlay return false when there's no skeleton loaded", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		expect(actions.advanceStage(undefined, "H999")).toBe(false);
		expect(actions.startAutoPlay(undefined, "H999")).toBe(false);
	});

	it("advanceStills wraps the stills index around the image count", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);

		actions.advanceStills(2);
		expect(state.stillsIndex).toBe(1);
		actions.advanceStills(2);
		expect(state.stillsIndex).toBe(0);
	});

	it("getAnimation returns the manual list once manualOverride is set", () => {
		const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		const skeleton = { setToSetupPose: () => {} } as any;
		const animationState = { clearTracks: () => {} } as any;

		actions.getAnimation(skeletonData, animationState, skeleton, "H999", () => []);
		state.sequencer.manualOverride = true;

		const result = actions.getAnimation(
			skeletonData,
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
		const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		const skeleton = { setToSetupPose: () => {} } as any;
		const animationState = { clearTracks: () => {} } as any;

		const result = actions.getAnimation(
			skeletonData,
			animationState,
			skeleton,
			"H999",
			() => []
		);

		expect(result).toEqual([
			{ trackIndex: 0, animationName: "00_idle", loop: true },
		]);
	});

	describe("handleCheckboxSelect", () => {
		it("checking an animation enters manual mode and re-anchors the stage to the picked animation", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.startAutoPlay(skeletonData, "H999");
			actions.advanceStage(skeletonData, "H999"); // -> stage 1 (20_loop)
			actions.advanceStage(skeletonData, "H999"); // -> stage 2 (40_end)
			expect(state.stageIndex).toBe(2);

			actions.handleCheckboxSelect(skeletonData, "H999", "00_idle", true);

			expect(state.sequencer.manualOverride).toBe(true);
			expect(state.autoPlay).toBe(false);
			expect(state.stageIndex).toBe(0); // re-anchored to 00_idle's stage
		});

		it("unchecking an animation still enters manual mode, but leaves stageIndex/sequence untouched", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.startAutoPlay(skeletonData, "H999");
			actions.advanceStage(skeletonData, "H999"); // -> stage 1
			const sequenceBefore = state.sequencer.sequence;

			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);

			expect(state.sequencer.manualOverride).toBe(true);
			expect(state.autoPlay).toBe(false);
			expect(state.stageIndex).toBe(1); // untouched - takeManualControl wasn't called
			expect(state.sequencer.sequence).toBe(sequenceBefore);
		});
	});
});
