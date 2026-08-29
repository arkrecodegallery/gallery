import { describe, expect, it, beforeEach } from "vitest";
import type { Animation, AnimationState, SkeletonData } from "@esotericsoftware/spine-core";
import type { Entry } from "$lib/core/types";
import { store } from "$lib/hooks/state.svelte";
import { ModelState } from "$lib/hooks/modelState.svelte";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names), skins: [{ name: "default" }] } as SkeletonData;
}

function fakeEntry(overrides: Partial<Entry> = {}): Entry {
	return {
		id: "H999",
		icons: { hero: "" },
		details: {} as Entry["details"],
		hero: { skel: "Assets/H999/H999.skel", atlas: "Assets/H999/H999.atlas" },
		...overrides,
	} as Entry;
}

beforeEach(() => {
	store.modelState = new ModelState();
	store.view = "hero";
	store.skeletonData = undefined;
	store.map = {};
});

describe("ModelState checkbox dispatch", () => {
	it("skill view: setAnimationChecked updates both skillView and the shared animations record", () => {
		store.view = "skill";

		store.modelState.input.setAnimationChecked("20_Loop", true);

		expect(store.modelState.skillView.skillActiveAnimationName).toBe("20_Loop");
		expect(store.modelState.checkboxAnimations.animations).toEqual({ "20_Loop": 0 });
	});

	it("hero view: setAnimationChecked updates heroAnimation's active clip and the shared record, exclusive and additive", () => {
		store.view = "hero";
		store.skeletonData = fakeSkeleton(["00_Idle", "04_Touch", "20_Loop"]);
		store.map = { H999: fakeEntry() };

		store.modelState.input.setAnimationChecked("20_Loop", true);
		expect(store.modelState.heroAnimation.currentClipName()).toBe("20_Loop");
		expect(store.modelState.checkboxAnimations.animations).toEqual({ "20_Loop": 0 });

		store.modelState.input.setAnimationChecked("04_Touch", true, true);
		expect(store.modelState.checkboxAnimations.animations).toEqual({
			"20_Loop": 0,
			"04_Touch": 1,
		});
	});

	it("bond view: setAnimationChecked flips manual override via the sequencer and updates the shared record", () => {
		store.view = "bond";
		store.skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
		store.map = {
			H999: fakeEntry({
				bond: [
					{
						kind: "animated",
						bundle: { skel: "Assets/H999/H999b.skel", atlas: "Assets/H999/H999b.atlas" },
						motions: [],
					},
				],
			}),
		};

		store.modelState.input.setAnimationChecked("20_loop", true);

		expect(store.modelState.bond.manualOverride).toBe(true);
		expect(store.modelState.checkboxAnimations.animations).toEqual({ "20_loop": 0 });
	});

	it("advancing a bond stage automatically updates the shared animations record via syncFrame", () => {
		store.view = "bond";
		store.skeletonData = fakeSkeleton(["00_idle", "20_loop", "40_end"]);
		store.map = {
			H999: fakeEntry({
				bond: [
					{
						kind: "animated",
						bundle: { skel: "Assets/H999/H999b.skel", atlas: "Assets/H999/H999b.atlas" },
						motions: [],
					},
				],
			}),
		};

		store.modelState.frameSync.startBondAutoPlay();
		store.modelState.frameSync.advanceBondStage(); // -> stage 1 (20_loop)

		const animationState = {
			getCurrent: (track: number) =>
				track === 0 ? { animation: { name: "20_loop" }, trackTime: 0 } : undefined,
		} as unknown as AnimationState;
		store.modelState.frameSync.syncFrame(animationState);

		expect(store.modelState.checkboxAnimations.animations).toEqual({ "20_loop": 0 });
	});
});
