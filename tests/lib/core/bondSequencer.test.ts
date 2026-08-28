import { describe, expect, it } from "vitest";
import type { Animation } from "@esotericsoftware/spine-core";
import { Animate } from "$lib/core/animate";
import { BondSequencer, CHAIN_ANIMATION_VARIANTS } from "$lib/core/bondSequencer";

function anims(names: string[]): Animation[] {
	return names.map((name) => ({ name }) as Animation);
}

function describeSequence(sequencer: BondSequencer): string {
	return sequencer.sequence
		.map((s) => (s.loop ? `${s.animationName} STOP` : s.animationName))
		.join(" -> ");
}

describe("BondSequencer", () => {
	it("enters the first stage directly with no bypass footage", () => {
		const animate = new Animate(anims(["00_idle", "20_loop"]));
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);

		expect(describeSequence(sequencer)).toBe("00_idle STOP");
		expect(sequencer.stageIndex).toBe(0);
	});

	describe("regression: stop point direction", () => {
		// Previously the sequencer treated the *last* entry of a group as
		// the stop point and everything before it as bypass footage. That's
		// backwards: `Animate.groupAnimations`'s `flush` always makes the
		// animation being stopped on the *first* entry of a new group, and
		// anything appended after it is footage that plays while *leaving*
		// that stage. Getting this backwards meant the engine stopped one
		// step too early (on a transition clip) and let the real resting
		// animation flash by as unlooped bypass content.

		it("A0150-style: stops on 01_Idle_ani, then advancing plays 02_Idle_in_ani on the way to landing on 10_Idle_ani", () => {
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
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0);
			expect(describeSequence(sequencer)).toBe("00_idle STOP");

			sequencer.advance(animate);
			expect(describeSequence(sequencer)).toBe("01_Idle_ani STOP");

			sequencer.advance(animate);
			expect(describeSequence(sequencer)).toBe(
				"02_Idle_in_ani -> 10_Idle_ani STOP"
			);
		});

		it("A0168-style: stops on 22_Loop_ani, then advancing plays both finish clips on the way to landing on 40_End_ani", () => {
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
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0); // 00_idle
			sequencer.advance(animate); // -> 20_loop
			sequencer.advance(animate); // -> 21_loop_ani
			sequencer.advance(animate); // -> 22_loop_ani
			expect(describeSequence(sequencer)).toBe("22_loop_ani STOP");

			sequencer.advance(animate);
			expect(describeSequence(sequencer)).toBe(
				"30_finish_ani -> 30_finish_out_ani -> 40_end_ani STOP"
			);
		});
	});

	it("advance() wraps back around to stage 0 after the last stage", () => {
		const animate = new Animate(anims(["00_idle", "20_loop", "40_end"]));
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);
		sequencer.advance(animate); // -> 20_loop
		sequencer.advance(animate); // -> 40_end
		sequencer.advance(animate); // wraps -> 00_idle

		expect(sequencer.stageIndex).toBe(0);
		expect(describeSequence(sequencer)).toBe("00_idle STOP");
	});

	it("handles a completely empty animation list without crashing", () => {
		// Animate.groupAnimations always pushes at least one (possibly
		// empty) group via its trailing unconditional flush(), so this
		// exercises the "no stop animation available" path rather than an
		// actual empty `groups` array.
		const animate = new Animate([]);
		const sequencer = new BondSequencer();

		expect(() => sequencer.advance(animate)).not.toThrow();
		expect(sequencer.sequence).toEqual([]);
	});

	it("a stop with numbered variants resolves per CHAIN_ANIMATION_VARIANTS: all alternates chained when on, one rotating alternate per visit when off", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop_1", "20_loop_2", "20_loop_3"])
		);
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);

		if (CHAIN_ANIMATION_VARIANTS) {
			expect(describeSequence(sequencer)).toBe(
				"20_loop_1 -> 20_loop_2 -> 20_loop_3"
			);
			expect(sequencer.loopChain).toEqual([
				"20_loop_1",
				"20_loop_2",
				"20_loop_3",
			]);
			return;
		}

		expect(describeSequence(sequencer)).toBe("20_loop_1 STOP");
		expect(sequencer.loopChain).toEqual([]);

		// leaving and re-entering the stage rotates to the next alternate
		sequencer.advance(animate); // -> 00_idle (wrap)
		sequencer.advance(animate); // -> back to the stop, next alternate
		expect(describeSequence(sequencer)).toBe("20_loop_2 STOP");
	});

	it("a single-clip stop keeps native looping and reports an empty loopChain", () => {
		const animate = new Animate(anims(["00_idle", "20_loop"]));
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);

		expect(describeSequence(sequencer)).toBe("20_loop STOP");
		expect(sequencer.loopChain).toEqual([]);
	});

	describe("regression: manual (checkbox) control", () => {
		it("takeManualControl re-anchors the stage index to wherever the picked animation actually lives", () => {
			const animate = new Animate(
				anims(["00_idle", "20_loop", "21_loop_ani", "40_end"])
			);
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0);
			sequencer.advance(animate); // -> stage 1 (20_loop)
			sequencer.advance(animate); // -> stage 2 (21_loop_ani)
			expect(sequencer.stageIndex).toBe(2);

			// user manually clicks the checkbox for the very first idle
			sequencer.takeManualControl(animate, "00_idle");

			expect(sequencer.manualOverride).toBe(true);
			expect(sequencer.stageIndex).toBe(0);
		});

		it("regression: advancing after a manual pick continues from the picked stage, not from wherever auto-advance last left off", () => {
			const animate = new Animate(
				anims(["00_idle", "20_loop", "21_loop_ani", "40_end"])
			);
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0);
			sequencer.advance(animate); // -> stage 1
			sequencer.advance(animate); // -> stage 2 (stale index the bug used to stick with)

			sequencer.takeManualControl(animate, "00_idle"); // manually back to idle

			sequencer.advance(animate); // should go to stage 1 (20_loop), not stage 3

			expect(sequencer.stageIndex).toBe(1);
			expect(describeSequence(sequencer)).toBe("20_loop STOP");
		});

		it("advance() clears manualOverride, handing control back to the auto-sequencer", () => {
			const animate = new Animate(anims(["00_idle", "20_loop"]));
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0);
			sequencer.takeManualControl(animate, "00_idle");
			expect(sequencer.manualOverride).toBe(true);

			sequencer.advance(animate);
			expect(sequencer.manualOverride).toBe(false);
		});

		it("leaves the stage index untouched if the picked animation isn't part of any stage and no ordering is given", () => {
			const animate = new Animate(anims(["00_idle", "20_loop"]));
			const sequencer = new BondSequencer();

			sequencer.enterStage(animate, 0);
			sequencer.advance(animate); // -> stage 1

			sequencer.takeManualControl(animate, "not_a_real_animation");

			expect(sequencer.manualOverride).toBe(true);
			expect(sequencer.stageIndex).toBe(1);
		});

		it("regression: a pick with no stage of its own (background/skip) re-anchors to the nearest stage before it", () => {
			// 90_BG is pulled into Animate's separate background channel, so it
			// has no entry in stageByName - the checklist still lets you check
			// it though, and clicking it shouldn't wipe out stage tracking.
			const animate = new Animate(
				anims(["00_idle", "20_loop", "90_BG", "40_end"])
			);
			const sequencer = new BondSequencer();
			const orderedNames = ["00_idle", "20_loop", "90_BG", "40_end"];

			sequencer.enterStage(animate, 0);
			sequencer.takeManualControl(animate, "90_BG", orderedNames);

			expect(sequencer.manualOverride).toBe(true);
			// nearest preceding animation with a stage is 20_loop (stage 1)
			expect(sequencer.stageIndex).toBe(1);
		});
	});

	it("reset() clears stage, sequence, manual override, loop chain, and cycle-alternate memory", () => {
		const animate = new Animate(
			anims(["00_idle", "20_loop_1", "20_loop_2"])
		);
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);
		sequencer.takeManualControl(animate, "20_loop_1");

		sequencer.reset();

		expect(sequencer.stageIndex).toBe(0);
		expect(sequencer.sequence).toEqual([]);
		expect(sequencer.manualOverride).toBe(false);
		expect(sequencer.loopChain).toEqual([]);

		// re-entering stage 1 picks the same alternate again - reset() clears
		// the per-visit rotation memory (moot when CHAIN_ANIMATION_VARIANTS is
		// on, since every alternate always plays together regardless)
		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);
		expect(describeSequence(sequencer)).toBe(
			CHAIN_ANIMATION_VARIANTS ? "20_loop_1 -> 20_loop_2" : "20_loop_1 STOP"
		);
	});

	it("cycle-alternate memory for bypass footage is cleared by reset()", () => {
		// 01_idle_ani/01_idle_ani2 land in the bypass slot (index 1 of stage
		// 0), not the stop slot, since 00_idle already claims index 0
		const animate = new Animate(
			anims(["00_idle", "01_idle_ani", "01_idle_ani2", "10_loop"])
		);
		const sequencer = new BondSequencer();

		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);
		expect(sequencer.sequence[0].animationName).toBe("01_idle_ani");

		sequencer.reset();
		sequencer.enterStage(animate, 0);
		sequencer.advance(animate);

		// without reset() clearing this memory, pickCycleAlternate would have
		// rotated to "01_idle_ani2" on this second visit
		expect(sequencer.sequence[0].animationName).toBe("01_idle_ani");
	});
});
