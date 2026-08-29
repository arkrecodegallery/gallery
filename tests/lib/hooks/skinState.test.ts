import { describe, expect, it } from "vitest";
import type { SkeletonData } from "@esotericsoftware/spine-core";
import { SkinState } from "$lib/hooks/skinState.svelte";

function fakeSkeleton(skinNames: string[]): SkeletonData {
	return { skins: skinNames.map((name) => ({ name })) } as SkeletonData;
}

describe("SkinState", () => {
	it("increment/decrement wrap between 1 and 3", () => {
		const state = new SkinState();

		state.decrement();
		expect(state.skinLevel).toBe(3); // wraps down from 1

		state.increment();
		expect(state.skinLevel).toBe(1); // wraps back up past 3

		state.skinLevel = 3;
		state.increment();
		expect(state.skinLevel).toBe(1); // wraps up from 3
	});

	it("hero view always uses LV<level>, regardless of available skins", () => {
		const state = new SkinState();
		state.skinLevel = 2;

		state.calculateSkin("hero", undefined);

		expect(state.skin).toBe("LV2");
	});

	it("alt view uses LV<level> when present, else falls back to the skeleton's first skin", () => {
		const state = new SkinState();
		state.skinLevel = 2;

		state.calculateSkin("alt", fakeSkeleton(["LV1", "LV2", "LV3"]));
		expect(state.skin).toBe("LV2");

		state.calculateSkin("alt", fakeSkeleton(["default"]));
		expect(state.skin).toBe("default");
	});

	it("skill/bond views try LV1, else fall back to the skeleton's first skin or the hardcoded default", () => {
		const state = new SkinState();

		state.calculateSkin("skill", fakeSkeleton(["LV1"]));
		expect(state.skin).toBe("LV1");

		state.calculateSkin("bond", fakeSkeleton(["default"]));
		expect(state.skin).toBe("default");

		state.calculateSkin("bond", undefined);
		expect(state.skin).toBe("default");
	});

	it("confirmManualPick suppresses exactly the next calculateSkin call", () => {
		const state = new SkinState();
		state.skinLevel = 3;
		state.skin = "manually-picked";

		state.confirmManualPick();
		state.calculateSkin("hero", undefined);
		expect(state.skin).toBe("manually-picked"); // suppressed

		state.calculateSkin("hero", undefined);
		expect(state.skin).toBe("LV3"); // back to normal on the next call
	});

	it("getSkin returns the current skin", () => {
		const state = new SkinState();
		state.skin = "LV2";
		expect(state.getSkin()).toBe("LV2");
	});
});
