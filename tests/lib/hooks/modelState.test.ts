import { describe, expect, it, beforeEach } from "vitest";
import type { Animation, AnimationState, SkeletonData } from "@esotericsoftware/spine-core";
import type { Entry } from "$lib/core/types";
import { store } from "$lib/hooks/state.svelte";
import { ModelState } from "$lib/hooks/modelState.svelte";
import { keybinds } from "$lib/core/keybinds.svelte";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function fakeSkeleton(names: string[]): SkeletonData {
	return { animations: anims(names), skins: [{ name: "default" }] } as SkeletonData;
}

function fakeEntry(overrides: Partial<Entry> = {}): Entry {
	return {
		id: "H999",
		details: {} as Entry["details"],
		hero: { skel: "Assets/H999/H999.skel", atlas: "Assets/H999/H999.atlas" },
		...overrides,
	} as Entry;
}

function pressKey(key: string) {
	window.dispatchEvent({ type: "keydown", key, target: {} } as unknown as Event);
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

describe("regression: q/e must override an active checkbox selection", () => {
	it("hero view: pressing q (Cutscene) after a checkbox check resumes normal cycling", () => {
		store.view = "hero";
		store.skeletonData = fakeSkeleton(["00_Idle", "04_Touch", "20_Loop"]);
		store.map = { H999: fakeEntry() };

		store.modelState.input.setAnimationChecked("20_Loop", true);
		expect(store.modelState.heroAnimation.currentClipName()).toBe("20_Loop");

		store.modelState.updateFlags.hasAnimationUpdate(); // clear whatever the checkbox click already requested
		store.modelState.input.handleAnimationChange(keybinds.Cutscene);

		expect(store.modelState.heroAnimation.currentClipName()).not.toBe("20_Loop");
		expect(store.modelState.updateFlags.hasAnimationUpdate()).toBe(true);
	});

	it("hero view: pressing e (Touch) after a checkbox check turns the checked loop into a one-shot", () => {
		store.view = "hero";
		store.skeletonData = fakeSkeleton(["00_Idle", "04_Touch", "20_Loop"]);
		store.map = { H999: fakeEntry() };
		const fakeAnimationState = {
			addListener: () => {},
			removeListener: () => {},
		} as unknown as AnimationState;

		store.modelState.input.setAnimationChecked("20_Loop", true);
		expect(store.modelState.heroAnimation.currentClipName()).toBe("20_Loop");
		expect(
			store.modelState.frameSync.getAnimation(
				store.skeletonData,
				fakeAnimationState,
				{} as any
			)
		).toContainEqual({ trackIndex: 1, animationName: "20_Loop", loop: true });

		store.modelState.input.handleAnimationChange(keybinds.Touch);

		// same clip name (checking synced selectedIndex to it), but no longer looping
		expect(store.modelState.heroAnimation.currentClipName()).toBe("20_Loop");
		expect(
			store.modelState.frameSync.getAnimation(
				store.skeletonData,
				fakeAnimationState,
				{} as any
			)
		).toContainEqual({ trackIndex: 1, animationName: "20_Loop", loop: false });
	});

	it("bond view: pressing e (Touch) after q (Cutscene) turns off auto-play", () => {
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

		store.modelState.input.handleAnimationChange(keybinds.Cutscene);
		expect(store.modelState.bond.autoPlay).toBe(true);

		store.modelState.input.handleAnimationChange(keybinds.Touch);
		expect(store.modelState.bond.autoPlay).toBe(false);
	});

	it("bond view: unchecking a checkbox freezes playback", () => {
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
		store.modelState.input.setAnimationChecked("20_loop", false);

		expect(store.modelState.bond.frozen).toBe(true);
	});
});

describe("regression: the global keydown listener must drive hero/view navigation", () => {
	beforeEach(() => {
		// each test's `new ModelState()` above registers another stale
		// window listener; drop them all and start with exactly one
		(window as unknown as { __clearEventListeners: () => void }).__clearEventListeners();
		store.modelState = new ModelState();
	});

	it("Hero_Increment advances the selected hero", () => {
		store.map = { H998: fakeEntry({ id: "H998" }), H999: fakeEntry({ id: "H999" }) };
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.updateFlags.hasModelUpdate(); // clear

		pressKey(keybinds.Hero_Increment);

		expect(store.modelState.heroSelection.relativeHeroIndex).toBe(1);
		expect(store.modelState.heroSelection.absoluteHeroIndex).toBe(1);
		expect(store.modelState.updateFlags.hasModelUpdate()).toBe(true);
	});

	it("Hero_View toggles between hero and alt view", () => {
		store.view = "hero";
		store.map = {
			H999: fakeEntry({
				alt: { skel: "Assets/H999/H999a.skel", atlas: "Assets/H999/H999a.atlas" },
			}),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;

		pressKey(keybinds.Hero_View);

		expect(store.view).toBe("alt");
	});
});

function stillsBond(images: string[]) {
	return { kind: "stills" as const, images };
}

describe("regression: hero switch must not use a stale cycleIndex for view-availability checks", () => {
	beforeEach(() => {
		(window as unknown as { __clearEventListeners: () => void }).__clearEventListeners();
		store.modelState = new ModelState();
	});

	it("bug: being on the 2nd bond and switching hero must stay on bond view for a hero whose bond array is shorter", () => {
		store.view = "bond";
		store.map = {
			H998: fakeEntry({ id: "H998", bond: [stillsBond(["a.png"])] }),
			H999: fakeEntry({ id: "H999", bond: [stillsBond(["b.png"]), stillsBond(["c.png"])] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 1;
		store.modelState.heroSelection.absoluteHeroIndex = 1;
		store.modelState.heroSelection.cycleIndex = 1; // "2nd bond" of H999

		pressKey(keybinds.Hero_Increment); // wraps around to H998, which only has bond[0]

		expect(store.view).toBe("bond");
		expect(store.modelState.heroSelection.cycleIndex).toBe(0);
	});

	it("hero switch still falls back to hero view when the new hero has no bond at all", () => {
		store.view = "bond";
		store.map = {
			H998: fakeEntry({ id: "H998" }), // no bond
			H999: fakeEntry({ id: "H999", bond: [stillsBond(["b.png"]), stillsBond(["c.png"])] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 1;
		store.modelState.heroSelection.absoluteHeroIndex = 1;
		store.modelState.heroSelection.cycleIndex = 1;

		pressKey(keybinds.Hero_Increment);

		expect(store.view).toBe("hero");
		expect(store.modelState.heroSelection.cycleIndex).toBe(0);
	});
});

describe("regression: stillsIndex must reset when the displayed bond changes", () => {
	beforeEach(() => {
		(window as unknown as { __clearEventListeners: () => void }).__clearEventListeners();
		store.modelState = new ModelState();
	});

	it("bug: switching hero must reset a stale stillsIndex left over from the previous hero's bond", () => {
		store.view = "bond";
		store.map = {
			H998: fakeEntry({
				id: "H998",
				bond: [stillsBond(["a1.png"]), stillsBond(["a2.png", "a3.png", "a4.png", "a5.png"])],
			}),
			H999: fakeEntry({ id: "H999", bond: [stillsBond(["b1.png"])] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.heroSelection.cycleIndex = 1;
		store.modelState.bond.stillsIndex = 3; // last image of the 4-image stills bond

		pressKey(keybinds.Hero_Increment);

		expect(store.modelState.bond.stillsIndex).toBe(0);
	});

	it("bug: cycling to a different bond of the same hero must reset a stale stillsIndex", () => {
		store.view = "bond";
		store.map = {
			H999: fakeEntry({
				id: "H999",
				bond: [
					stillsBond(["a1.png", "a2.png", "a3.png", "a4.png"]),
					stillsBond(["b1.png"]),
				],
			}),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.heroSelection.cycleIndex = 0;
		store.modelState.bond.stillsIndex = 3;

		pressKey(keybinds.Bond_View); // cycle from bond[0] (4 images) to bond[1] (1 image)

		expect(store.modelState.heroSelection.cycleIndex).toBe(1);
		expect(store.modelState.bond.stillsIndex).toBe(0);
	});

	it("cycling bond view with only one bond entry (wraps to the same entry) does not reset stillsIndex", () => {
		store.view = "bond";
		store.map = {
			H999: fakeEntry({
				id: "H999",
				bond: [stillsBond(["a1.png", "a2.png", "a3.png"])],
			}),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.heroSelection.cycleIndex = 0;
		store.modelState.bond.stillsIndex = 2;

		pressKey(keybinds.Bond_View); // only one bond entry -> wraps back to index 0, no real switch

		expect(store.modelState.heroSelection.cycleIndex).toBe(0);
		expect(store.modelState.bond.stillsIndex).toBe(2);
	});
});

describe("regression: hero-switch view/skin behavior beyond bond view", () => {
	beforeEach(() => {
		(window as unknown as { __clearEventListeners: () => void }).__clearEventListeners();
		store.modelState = new ModelState();
	});

	it("preserves the current view across hero switch when the new hero supports it", () => {
		store.view = "skill";
		store.map = {
			H998: fakeEntry({ id: "H998", skill: { skel: "s.skel", atlas: "s.atlas" } }),
			H999: fakeEntry({ id: "H999", skill: { skel: "s2.skel", atlas: "s2.atlas" } }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;

		pressKey(keybinds.Hero_Increment);

		expect(store.view).toBe("skill");
	});

	it("falls back to hero view when the new hero has no skill data", () => {
		store.view = "skill";
		store.map = {
			H998: fakeEntry({ id: "H998", skill: { skel: "s.skel", atlas: "s.atlas" } }),
			H999: fakeEntry({ id: "H999" }), // no skill
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;

		pressKey(keybinds.Hero_Increment);

		expect(store.view).toBe("hero");
	});

	it("falls back to hero view when the new hero's collection is empty", () => {
		store.view = "collection";
		store.map = {
			H998: fakeEntry({ id: "H998", collection: ["cg1.png"] }),
			H999: fakeEntry({ id: "H999", collection: [] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;

		pressKey(keybinds.Hero_Increment);

		expect(store.view).toBe("hero");
	});

	it("resets skinLevel to 1 on hero switch", () => {
		store.view = "hero";
		store.map = { H998: fakeEntry({ id: "H998" }), H999: fakeEntry({ id: "H999" }) };
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.skinState.skinLevel = 3;

		pressKey(keybinds.Hero_Increment);

		expect(store.modelState.skinState.skinLevel).toBe(1);
	});

	it("collection view cycling wraps cycleIndex across entries of the same hero", () => {
		store.view = "collection";
		store.map = {
			H999: fakeEntry({ id: "H999", collection: ["cg1.png", "cg2.png"] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 0;
		store.modelState.heroSelection.absoluteHeroIndex = 0;
		store.modelState.heroSelection.cycleIndex = 0;

		pressKey(keybinds.Collection_View);
		expect(store.modelState.heroSelection.cycleIndex).toBe(1);

		pressKey(keybinds.Collection_View);
		expect(store.modelState.heroSelection.cycleIndex).toBe(0);
	});

	it("selectHeroById goes through the same reset path as keyboard hero switching", () => {
		store.view = "bond";
		store.map = {
			H998: fakeEntry({ id: "H998", bond: [stillsBond(["a.png"])] }),
			H999: fakeEntry({ id: "H999", bond: [stillsBond(["b.png"]), stillsBond(["c.png"])] }),
		};
		store.modelState.heroSelection.relativeHeroIndex = 1;
		store.modelState.heroSelection.absoluteHeroIndex = 1;
		store.modelState.heroSelection.cycleIndex = 1;
		store.modelState.bond.stillsIndex = 3;

		store.modelState.navigation.selectHeroById("H998");

		expect(store.view).toBe("bond");
		expect(store.modelState.heroSelection.cycleIndex).toBe(0);
		expect(store.modelState.bond.stillsIndex).toBe(0);
	});
});
