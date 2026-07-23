import { describe, expect, it } from "vitest";
import type { Animation } from "@esotericsoftware/spine-core";
import { Animate } from "./animate";
import { getBondRule } from "./bondRules";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

/** Groups as plain nested string arrays, easy to assert against. */
function groupNames(animate: Animate): string[][][] {
	return animate.groups.map((group) =>
		group.map((entry) => entry.animations.map((a) => a.name))
	);
}

function bgNames(animate: Animate): string[] {
	return animate.background.map((a) => a.name);
}

describe("Animate.stageByName", () => {
	it("groups bypass footage with the stop it leads into, not the one it leaves", () => {
		const animate = new Animate(anims(["00_idle", "01_idle_in", "10_loop"]));
		expect(Object.fromEntries(animate.stageByName)).toEqual({
			"00_idle": 0,
			"01_idle_in": 1,
			"10_loop": 1,
		});
	});

	it("chains multiple bypass entries into the final stop's display group", () => {
		const animate = new Animate(
			anims([
				"00_idle",
				"20_loop",
				"21_loop_ani",
				"22_loop_ani",
				"30_finish_ani",
				"30_finish_out_ani",
				"40_end_ani",
			])
		);
		expect(Object.fromEntries(animate.stageByName)).toEqual({
			"00_idle": 0,
			"20_loop": 1,
			"21_loop_ani": 2,
			"22_loop_ani": 3,
			"30_finish_ani": 4,
			"30_finish_out_ani": 4,
			"40_end_ani": 4,
		});
	});

	it("keeps trailing bypass footage on the last group's own stage (no next stop to lead into)", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop", "35_something_weird"])
		);
		expect(Object.fromEntries(animate.stageByName)).toEqual({
			"00_idle": 0,
			"20_loop": 1,
			"35_something_weird": 1,
		});
	});
});

describe("Animate.groupAnimations", () => {
	it("stops on the first 00-prefixed idle and treats it as the sole starting group", () => {
		const animate = new Animate(anims(["00_idle"]));
		expect(groupNames(animate)).toEqual([[["00_idle"]]]);
	});

	it("regression: multiple consecutive 00_idle* animations become cycle alternates on the same entry, not separate discarded groups", () => {
		const animate = new Animate(
			anims(["00_idle_1", "00_idle_2", "00_idle_3", "01_idle_in", "10_loop"])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle_1", "00_idle_2", "00_idle_3"], ["01_idle_in"]],
			[["10_loop"]],
		]);
	});

	it("idle -> idle_in -> idle (same 0X family) stays in one group", () => {
		const animate = new Animate(anims(["00_idle", "01_idle_in", "02_idle"]));
		expect(groupNames(animate)).toEqual([
			[["00_idle"], ["01_idle_in"], ["02_idle"]],
		]);
	});

	it("idle -> idle_in -> loop stops the idle-family group right before the loop", () => {
		const animate = new Animate(anims(["00_idle", "01_idle_in", "10_loop"]));
		expect(groupNames(animate)).toEqual([
			[["00_idle"], ["01_idle_in"]],
			[["10_loop"]],
		]);
	});

	it("1X named with 'idle' text behaves like another idle family, not a loop, even though its stage digit changed", () => {
		const animate = new Animate(
			anims([
				"00_idle",
				"01_idle_in",
				"10_idle",
				"11_idle_in",
				"20_loop",
			])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"], ["01_idle_in"]],
			[["10_idle"], ["11_idle_in"]],
			[["20_loop"]],
		]);
	});

	it("loops with the same base name (trailing digit only) cycle together", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop_1", "20_loop_2", "21_loop_other"])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"]],
			[["20_loop_1", "20_loop_2"]],
			[["21_loop_other"]],
		]);
	});

	it("a finish bypasses through into the following end and only ever appears once", () => {
		const animate = new Animate(anims(["00_idle", "20_loop", "30_finish", "40_end"]));
		expect(groupNames(animate)).toEqual([
			[["00_idle"]],
			[["20_loop"], ["30_finish"]],
			[["40_end"]],
		]);
	});

	it("does not drop a legitimately distinct finish that happens to start with a previous finish's name", () => {
		// this exercises the removal of the old `startsWith`-based
		// "skip invalid finish" branch, which would have incorrectly
		// dropped 03_finish_kiss because it starts with 03_finish
		const animate = new Animate(
			anims(["00_idle", "20_loop", "03_finish", "03_finish_kiss", "40_end"])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"]],
			[["20_loop"], ["03_finish"], ["03_finish_kiss"]],
			[["40_end"]],
		]);
	});

	it("three transitions in a row collapse down to only the first", () => {
		const animate = new Animate(
			anims([
				"00_idle",
				"01_idle_out",
				"01_idle2_out",
				"01_idle3_out",
				"10_loop",
			])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"], ["01_idle_out"]],
			[["10_loop"]],
		]);
	});

	it("ends with the same base name cycle together, but a differently-named end starts a new stop", () => {
		const animate = new Animate(
			anims([
				"00_idle",
				"20_loop",
				"40_end_1",
				"40_end_2",
				"41_end_other",
			])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"]],
			[["20_loop"]],
			[["40_end_1", "40_end_2"]],
			[["41_end_other"]],
		]);
	});

	it("excludes stage 80/90 animations from progression, except the literal 90_BG channel", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop", "80_misc", "90_bg2", "90_BG"])
		);
		expect(groupNames(animate)).toEqual([[["00_idle"]], [["20_loop"]]]);
		// regression: `fullName` is lowercased in parseName, so the bg check
		// must compare against "90_bg", not "90_BG" - otherwise this list is
		// always empty even when a 90_BG clip is present
		expect(bgNames(animate)).toEqual(["90_BG"]);
	});

	it("unrecognized animation modes default to 'finish' and bypass through", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop", "35_something_weird", "40_end"])
		);
		expect(groupNames(animate)).toEqual([
			[["00_idle"]],
			[["20_loop"], ["35_something_weird"]],
			[["40_end"]],
		]);
	});

	it("touch/emo special animations are skipped outright, never appearing in any group", () => {
		const animate = new Animate(
			anims(["00_idle", "05_touch_ani", "20_loop"])
		);
		expect(groupNames(animate)).toEqual([[["00_idle"]], [["20_loop"]]]);
	});

	describe("bond rule overrides", () => {
		it("rule.skip removes exact animation names before grouping", () => {
			const animate = new Animate(
				anims(["00_idle", "01_lick_ani", "03_lick_ani", "20_loop"]),
				{ skip: ["03_lick_ani"] }
			);
			expect(groupNames(animate)).toEqual([
				[["00_idle"], ["01_lick_ani"]],
				[["20_loop"]],
			]);
		});

		it("rule.rename aliases a name for classification only - the real animation object/name is preserved in the output", () => {
			const animate = new Animate(
				anims(["get_in_weird_clip_name", "20_loop"]),
				{ rename: { get_in_weird_clip_name: "01_idle_in" } }
			);
			// classified as a transition (bypassed, not a stop) because of the
			// alias, but the stored/queued name is still the real clip name
			expect(groupNames(animate)).toEqual([
				[["get_in_weird_clip_name"]],
				[["20_loop"]],
			]);
		});
	});

	describe("real-world regression cases", () => {
		it("A0150-style: 01_Idle_ani stops before the transition into 10_Idle_ani, not after it", () => {
			const animate = new Animate(
				anims([
					"00_idle",
					"01_Idle_ani",
					"02_Idle_in_ani",
					"10_Idle_ani",
					"11_Idle_in_ani",
					"20_loop",
				])
			);
			// group boundaries are decided on the lowercased/normalized name,
			// but the stored/queued animation objects keep their real casing
			expect(groupNames(animate)).toEqual([
				[["00_idle"]],
				[["01_Idle_ani"], ["02_Idle_in_ani"]],
				[["10_Idle_ani"], ["11_Idle_in_ani"]],
				[["20_loop"]],
			]);
		});

		it("A0168-style: 22_Loop_ani stops on its own, with 30_Finish_ani/30_Finish_out_ani as bypass footage leading into 40_End_ani", () => {
			const animate = new Animate(
				anims([
					"00_idle",
					"20_loop",
					"21_loop_ani",
					"22_loop_ani",
					"30_finish_ani",
					"30_finish_out_ani",
					"40_end_ani",
				])
			);
			expect(groupNames(animate)).toEqual([
				[["00_idle"]],
				[["20_loop"]],
				[["21_loop_ani"]],
				[["22_loop_ani"], ["30_finish_ani"], ["30_finish_out_ani"]],
				[["40_end_ani"]],
			]);
		});

		it("H135-style: a suffixless loop and its explicitly-numbered variant chain into one big loop", () => {
			const animate = new Animate(
				anims([
					"00_idle",
					"20_loop",
					"21_loop_ani",
					"21_loop_ani2",
					"30_finish_ani",
					"40_end_ani",
				])
			);
			expect(groupNames(animate)).toEqual([
				[["00_idle"]],
				[["20_loop"]],
				[["21_loop_ani", "21_loop_ani2"], ["30_finish_ani"]],
				[["40_end_ani"]],
			]);
		});

		it("a three-way numbered variant chain (implicit 1, explicit 2 and 3) all merge into one stop", () => {
			const animate = new Animate(
				anims([
					"00_idle",
					"20_loop_ani",
					"20_loop_ani2",
					"20_loop_ani3",
					"40_end",
				])
			);
			expect(groupNames(animate)).toEqual([
				[["00_idle"]],
				[["20_loop_ani", "20_loop_ani2", "20_loop_ani3"]],
				[["40_end"]],
			]);
		});

		it("H115/A0145-style: bondRules.rename keeps 01_Idle_hand_ani as its own stop and cycles 40_End_ani/41_End_ani as alternates", () => {
			// exact animation order pulled from the real A0145.skel via
			// scripts/extract-skel-animations.test.ts (see skel-animations skill)
			const animate = new Animate(
				anims([
					"00_Idle_ani",
					"01_Idle_hand_ani",
					"02_Take_off_ani",
					"05_Idle_ani",
					"10_Loop_ani",
					"11_Loop_ani",
					"20_Loop_ani",
					"21_Loop_ani",
					"22_Loop_ani",
					"23_Loop_ani",
					"24_Loop_ani",
					"30_Finish_ani",
					"40_End_ani",
					"41_End_ani",
				]),
				getBondRule("H115")
			);
			expect(groupNames(animate)).toEqual([
				[["00_Idle_ani"]],
				[["01_Idle_hand_ani"], ["02_Take_off_ani"]],
				[["05_Idle_ani"]],
				[["10_Loop_ani"]],
				[["11_Loop_ani"]],
				[["20_Loop_ani"]],
				[["21_Loop_ani"]],
				[["22_Loop_ani"]],
				[["23_Loop_ani"]],
				[["24_Loop_ani"], ["30_Finish_ani"]],
				[["40_End_ani", "41_End_ani"]],
			]);
		});
	});
});
