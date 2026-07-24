import { describe, expect, it } from "vitest";
import type {
	Animation,
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { HeroViewState } from "$lib/hooks/heroViewState.svelte";

const HERO_ID = "H001";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names) } as SkeletonData;
}

class FakeAnimationState {
	listeners: AnimationStateListener[] = [];
	tracks: Record<number, { animation?: { name: string }; trackTime: number }> = {};

	addListener(listener: AnimationStateListener) {
		this.listeners.push(listener);
	}
	removeListener(listener: AnimationStateListener) {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}
	setEmptyAnimation(trackIndex: number) {
		delete this.tracks[trackIndex];
	}
	getCurrent(trackIndex: number) {
		return this.tracks[trackIndex];
	}
	setTrack(trackIndex: number, name: string, trackTime = 0) {
		this.tracks[trackIndex] = { animation: { name } as any, trackTime };
	}
	complete(entry: TrackEntry) {
		this.listeners.slice().forEach((l) => l.complete?.(entry));
	}
}

describe("HeroViewState", () => {
	it("eligibility excludes idle and prefix >= 90; cycleSelection advances sequentially and wraps", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch", "20_Loop", "90_BG"]);
		const state = new HeroViewState();

		state.cycleSelection(skeleton, HERO_ID);
		expect(state.eligibleNames).toEqual(["04_Touch", "20_Loop"]);
		expect(state.selectedIndex).toBe(1);

		state.cycleSelection(skeleton, HERO_ID);
		expect(state.selectedIndex).toBe(0); // wraps back around
	});

	it("playSelected captures the current selection and ignores a re-press mid-playback", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch", "20_Loop"]);
		const state = new HeroViewState();

		expect(state.playSelected(skeleton, HERO_ID)).toBe(true);
		expect(state.playingIndex).toBe(0);

		expect(state.playSelected(skeleton, HERO_ID)).toBe(false); // clip already active
	});

	it("getAnimation keeps idle on track 0 and plays the selected clip once on the next track", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch"]);
		const state = new HeroViewState();
		const animationState = new FakeAnimationState();

		state.playSelected(skeleton, HERO_ID);
		const result = state.getAnimation(
			skeleton,
			animationState as unknown as AnimationState,
			HERO_ID
		);

		expect(result).toEqual([
			{ trackIndex: 0, animationName: "00_Idle", loop: true },
			{ trackIndex: 1, animationName: "04_Touch", loop: false },
		]);
	});

	it("resumes idle and clears playingIndex once the selected clip's completion event fires", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch"]);
		const state = new HeroViewState();
		const animationState = new FakeAnimationState();

		state.playSelected(skeleton, HERO_ID);
		state.getAnimation(skeleton, animationState as unknown as AnimationState, HERO_ID);
		animationState.setTrack(0, "00_Idle", 5);

		animationState.complete({ animation: { name: "04_Touch" } } as TrackEntry);

		expect(state.playingIndex).toBe(-1);
		expect(animationState.getCurrent(0)?.trackTime).toBe(0);
	});

	it("setChecked loops any animation (not just eligible ones) and switches directly between them", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch", "90_BG"]);
		const state = new HeroViewState();
		const animationState = new FakeAnimationState();

		state.setChecked(skeleton, "90_BG", true, HERO_ID);
		expect(state.currentClipName()).toBe("90_BG");
		expect(
			state.getAnimation(skeleton, animationState as unknown as AnimationState, HERO_ID)
		).toEqual([
			{ trackIndex: 0, animationName: "00_Idle", loop: true },
			{ trackIndex: 1, animationName: "90_BG", loop: true },
		]);

		state.setChecked(skeleton, "04_Touch", true, HERO_ID);
		expect(state.currentClipName()).toBe("04_Touch");

		state.setChecked(skeleton, "04_Touch", false, HERO_ID);
		expect(state.currentClipName()).toBe("00_Idle");
		expect(
			state.getAnimation(skeleton, animationState as unknown as AnimationState, HERO_ID)
		).toEqual([
			{ trackIndex: 0, animationName: "00_Idle", loop: true },
			{ trackIndex: 1, animationName: "00_Idle", loop: true },
		]);
	});

	it("resets selection when the skeleton changes", () => {
		const skeleton1 = fakeSkeleton(["00_Idle", "04_Touch"]);
		const skeleton2 = fakeSkeleton(["00_Idle", "05_Wave"]);
		const state = new HeroViewState();

		state.cycleSelection(skeleton1, HERO_ID);
		state.cycleSelection(skeleton2, HERO_ID);

		expect(state.eligibleNames).toEqual(["05_Wave"]);
		expect(state.selectedIndex).toBe(0);
	});

	it("resets selection when the hero id changes on the same skeleton reference", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch"]);
		const state = new HeroViewState();

		state.cycleSelection(skeleton, "H001");
		state.cycleSelection(skeleton, "H002");

		expect(state.selectedIndex).toBe(0);
	});
});
