import { describe, expect, it } from "vitest";
import type {
	Animation,
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { SkillViewState } from "$lib/hooks/skillViewState.svelte";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names) } as SkeletonData;
}

class FakeAnimationState {
	listeners: AnimationStateListener[] = [];
	tracks: ({ animation?: { name: string }; trackTime: number } | undefined)[] = [];

	addListener(listener: AnimationStateListener) {
		this.listeners.push(listener);
	}
	removeListener(listener: AnimationStateListener) {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}
	setEmptyAnimation(trackIndex: number) {
		this.tracks[trackIndex] = undefined;
	}
	setAnimation(trackIndex: number, name: string, _loop: boolean) {
		this.tracks[trackIndex] = { animation: { name }, trackTime: 0 };
	}
	getCurrent(trackIndex: number) {
		return this.tracks[trackIndex];
	}
	complete(entry: TrackEntry) {
		this.listeners.slice().forEach((l) => l.complete?.(entry));
	}
}

describe("SkillViewState", () => {
	it("getAnimation puts idle on track 0 and eligible bg clips after it", () => {
		const skeleton = fakeSkeleton(["00_Idle", "90_BG", "04_Touch"]);
		const state = new SkillViewState();
		const animationState = new FakeAnimationState();

		const result = state.getAnimation(
			skeleton,
			animationState as unknown as AnimationState
		);

		expect(result).toEqual([
			{ trackIndex: 0, animationName: "00_Idle", loop: true },
			{ trackIndex: 1, animationName: "90_BG", loop: true },
			{ trackIndex: 50, animationName: "00_Idle", loop: true },
		]);
	});

	it("requestTouch plays the one-shot on its own track, then resumes the checkbox idle on completion", () => {
		const skeleton = fakeSkeleton(["00_Idle", "04_Touch"]);
		const state = new SkillViewState();
		const animationState = new FakeAnimationState();

		state.requestTouch();
		const result = state.getAnimation(
			skeleton,
			animationState as unknown as AnimationState
		);

		// idle (already playing on track 0 from a prior call) is left alone;
		// only the new one-shot track is returned this call
		expect(result).toEqual([
			{ trackIndex: 1, animationName: "04_Touch", loop: false },
		]);
		expect(state.skillActiveTrackIndex).toBe(1);

		animationState.tracks[0] = { animation: { name: "00_Idle" }, trackTime: 5 };
		animationState.complete({ animation: { name: "04_Touch" } } as TrackEntry);

		expect(state.skillActiveTrackIndex).toBe(0);
		expect(animationState.getCurrent(0)?.trackTime).toBe(0); // idle time reset
		expect(animationState.getCurrent(50)?.animation?.name).toBe("00_Idle"); // checkbox track resumed
	});

	it("setChecked toggles the active checkbox animation and currentCheckboxAnimation falls back to idle", () => {
		const skeleton = fakeSkeleton(["00_Idle", "20_Loop"]);
		const state = new SkillViewState();
		const animationState = new FakeAnimationState();

		expect(
			state.currentCheckboxAnimation(animationState as unknown as AnimationState, skeleton)
		).toBe("00_Idle");

		state.setChecked("20_Loop", true);
		expect(
			state.currentCheckboxAnimation(animationState as unknown as AnimationState, skeleton)
		).toBe("20_Loop");

		state.setChecked("20_Loop", false);
		expect(
			state.currentCheckboxAnimation(animationState as unknown as AnimationState, skeleton)
		).toBe("00_Idle");
	});

	it("resets active state when the skeleton changes, but not on repeat calls with the same one", () => {
		const skeleton1 = fakeSkeleton(["00_Idle"]);
		const skeleton2 = fakeSkeleton(["00_Idle"]);
		const state = new SkillViewState();
		const animationState = new FakeAnimationState();

		state.getAnimation(skeleton1, animationState as unknown as AnimationState);
		state.setChecked("20_Loop", true);

		state.getAnimation(skeleton1, animationState as unknown as AnimationState);
		expect(state.skillActiveAnimationName).toBe("20_Loop"); // same skeleton, untouched

		state.getAnimation(skeleton2, animationState as unknown as AnimationState);
		expect(state.skillActiveAnimationName).toBeUndefined(); // new skeleton, reset
	});
});
