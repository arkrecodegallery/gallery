import { describe, expect, it } from "vitest";
import type { Animation, SkeletonData, TrackEntry } from "@esotericsoftware/spine-core";
import { BondViewState } from "$lib/hooks/bondViewState.svelte";
import { BondSequenceActions } from "$lib/hooks/bondSequenceActions";
import { BondAutoPlay } from "$lib/hooks/bondAutoPlay";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names) } as SkeletonData;
}

function fakeEntry(next: TrackEntry | null = null): TrackEntry {
	return { next } as TrackEntry;
}

describe("BondAutoPlay", () => {
	const skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);

	it("does nothing when auto-play isn't running", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		let updated = false;
		const autoPlay = new BondAutoPlay(state, actions, () => (updated = true));

		autoPlay.handleAnimationComplete(fakeEntry(), {} as any, "bond", skeletonData, "H999");

		expect(updated).toBe(false);
		expect(state.stageIndex).toBe(0);
	});

	it("advances one stage per completed animation while auto-playing, then stops at the last stage", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		let updateCount = 0;
		const autoPlay = new BondAutoPlay(state, actions, () => updateCount++);

		actions.startAutoPlay(skeletonData, "H999");
		expect(state.autoPlay).toBe(true);

		autoPlay.handleAnimationComplete(fakeEntry(), {} as any, "bond", skeletonData, "H999");
		expect(state.stageIndex).toBe(1);
		expect(updateCount).toBe(1);

		autoPlay.handleAnimationComplete(fakeEntry(), {} as any, "bond", skeletonData, "H999");
		expect(state.stageIndex).toBe(2);
		expect(updateCount).toBe(2);

		// three groups (00_idle/20_loop/40_end) means index 2 is the last stage
		autoPlay.handleAnimationComplete(fakeEntry(), {} as any, "bond", skeletonData, "H999");
		expect(state.autoPlay).toBe(false);
		expect(updateCount).toBe(2);
	});

	it("ignores completion events for a track with a queued follow-up (entry.next !== null)", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		let updated = false;
		const autoPlay = new BondAutoPlay(state, actions, () => (updated = true));

		actions.startAutoPlay(skeletonData, "H999");
		autoPlay.handleAnimationComplete(
			fakeEntry(fakeEntry()),
			{} as any,
			"bond",
			skeletonData,
			"H999"
		);

		expect(updated).toBe(false);
		expect(state.stageIndex).toBe(0);
	});

	it("does not advance when manualOverride is set", () => {
		const state = new BondViewState();
		const actions = new BondSequenceActions(state);
		let updated = false;
		const autoPlay = new BondAutoPlay(state, actions, () => (updated = true));

		actions.startAutoPlay(skeletonData, "H999");
		state.manualOverride = true;

		autoPlay.handleAnimationComplete(fakeEntry(), {} as any, "bond", skeletonData, "H999");

		expect(updated).toBe(false);
	});
});
