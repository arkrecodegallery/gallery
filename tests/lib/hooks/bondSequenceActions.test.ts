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

	describe("regression: e must override q mode (autoPlay)", () => {
		it("advanceStage (e) clears autoPlay, so a later completion doesn't auto-advance again", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.startAutoPlay(skeletonData, "H999"); // q
			expect(state.autoPlay).toBe(true);

			actions.advanceStage(skeletonData, "H999"); // e
			expect(state.autoPlay).toBe(false);
		});

		it("startAutoPlay (q) sets autoPlay back on", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.startAutoPlay(skeletonData, "H999");
			actions.advanceStage(skeletonData, "H999");
			expect(state.autoPlay).toBe(false);

			actions.startAutoPlay(skeletonData, "H999");
			expect(state.autoPlay).toBe(true);
		});
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

		it("unchecking an animation freezes playback instead of entering a blank manual mode", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.startAutoPlay(skeletonData, "H999");
			actions.advanceStage(skeletonData, "H999"); // -> stage 1

			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);

			expect(state.frozen).toBe(true);
			expect(state.autoPlay).toBe(false);
		});
	});

	describe("regression: unchecking a bond animation freezes the current frame", () => {
		function fakeAnimationState(currentByTrack: Record<number, { timeScale: number }>) {
			let clearTracksCalls = 0;
			return {
				get clearTracksCalls() {
					return clearTracksCalls;
				},
				clearTracks: () => {
					clearTracksCalls += 1;
				},
				getCurrent: (trackIndex: number) => currentByTrack[trackIndex],
			};
		}

		it("getAnimation freezes track 0's timeScale, returns no animations, and skips clearTracks", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);
			const skeleton = { setToSetupPose: () => {} } as any;
			const track0 = { timeScale: 1 };
			const animationState = fakeAnimationState({ 0: track0 });

			// settle lastSkeletonData first, as the real initial model load would,
			// so the freeze below isn't masked by the "new skeleton" reset path
			actions.getAnimation(skeletonData, animationState as any, skeleton, "H999", () => []);

			actions.startAutoPlay(skeletonData, "H999");
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);

			const clearTracksCallsBefore = animationState.clearTracksCalls;
			const result = actions.getAnimation(
				skeletonData,
				animationState as any,
				skeleton,
				"H999",
				() => []
			);

			expect(result).toEqual([]);
			expect(track0.timeScale).toBe(0);
			expect(animationState.clearTracksCalls).toBe(clearTracksCallsBefore);
		});

		it("stays frozen across repeated getAnimation calls until q/e/checkbox is pressed", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);
			const skeleton = { setToSetupPose: () => {} } as any;
			const track0 = { timeScale: 1 };
			const animationState = fakeAnimationState({ 0: track0 });

			actions.getAnimation(skeletonData, animationState as any, skeleton, "H999", () => []);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);

			actions.getAnimation(skeletonData, animationState as any, skeleton, "H999", () => []);
			const clearTracksCallsBefore = animationState.clearTracksCalls;
			const result = actions.getAnimation(
				skeletonData,
				animationState as any,
				skeleton,
				"H999",
				() => []
			);

			expect(result).toEqual([]);
			expect(animationState.clearTracksCalls).toBe(clearTracksCallsBefore);
		});

		it("advanceStage (e) unfreezes and resumes the normal sequence", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);
			const skeleton = { setToSetupPose: () => {} } as any;
			const animationState = fakeAnimationState({ 0: { timeScale: 0 } });

			actions.getAnimation(skeletonData, animationState as any, skeleton, "H999", () => []);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);
			expect(state.frozen).toBe(true);

			actions.advanceStage(skeletonData, "H999");
			expect(state.frozen).toBe(false);

			const clearTracksCallsBefore = animationState.clearTracksCalls;
			const result = actions.getAnimation(
				skeletonData,
				animationState as any,
				skeleton,
				"H999",
				() => []
			);
			expect(result.length).toBeGreaterThan(0);
			expect(animationState.clearTracksCalls).toBe(clearTracksCallsBefore + 1);
		});

		it("startAutoPlay (q) unfreezes and resumes auto-play", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);
			expect(state.frozen).toBe(true);

			actions.startAutoPlay(skeletonData, "H999");
			expect(state.frozen).toBe(false);
			expect(state.autoPlay).toBe(true);
		});

		it("checking a different box unfreezes and takes manual control of the new selection", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);

			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);
			expect(state.frozen).toBe(true);

			actions.handleCheckboxSelect(skeletonData, "H999", "40_end", true);
			expect(state.frozen).toBe(false);
			expect(state.sequencer.manualOverride).toBe(true);
		});

		it("switching to a new skeleton clears the frozen flag", () => {
			const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const otherSkeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
			const state = new BondViewState();
			const actions = new BondSequenceActions(state);
			const skeleton = { setToSetupPose: () => {} } as any;
			const animationState = fakeAnimationState({ 0: { timeScale: 0 } });

			actions.getAnimation(skeletonData, animationState as any, skeleton, "H999", () => []);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", true);
			actions.handleCheckboxSelect(skeletonData, "H999", "20_loop", false);
			expect(state.frozen).toBe(true);

			actions.getAnimation(
				otherSkeletonData,
				animationState as any,
				skeleton,
				"H999",
				() => []
			);
			expect(state.frozen).toBe(false);
		});
	});
});
