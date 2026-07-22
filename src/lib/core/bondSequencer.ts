import type { Animation as SpineAnimation } from "@esotericsoftware/spine-core";
import type { Animate } from "./animate";

export interface BondSequenceStep {
	animationName: string;
	loop: boolean;
}

/**
 * Owns the bond auto-play state machine: which stage is active, what
 * sequence of animations should currently be queued for it, and whether a
 * manual (checkbox) selection has taken control away from auto-advance.
 *
 * `animate.groups[stageIndex][0]` is always the resting/stop animation for
 * a stage (see `Animate.groupAnimations`'s `flush`, which always seeds a
 * new group with the animation being stopped on). Everything after index 0
 * in a group is bypass footage that plays while *leaving* that stage on the
 * way to the next stage's stop - not part of the stage being entered.
 */
export class BondSequencer {
	stageIndex = 0;
	sequence: BondSequenceStep[] = [];
	manualOverride = false;

	private cycleAlternateState = new Map<string, number>();

	reset() {
		this.stageIndex = 0;
		this.sequence = [];
		this.manualOverride = false;
		this.cycleAlternateState.clear();
	}

	/** Jump directly to a stage's stop with no bypass footage (e.g. first load). */
	enterStage(animate: Animate, stageIndex: number) {
		this.manualOverride = false;
		this.applyStage(animate, stageIndex);
	}

	/**
	 * Advance from the current stage to the next, playing bypass footage en
	 * route. Returns false (no-op) if there are no stages to advance through.
	 */
	advance(animate: Animate): boolean {
		if (animate.groups.length === 0) {
			return false;
		}

		this.manualOverride = false;
		const nextIndex = (this.stageIndex + 1) % animate.groups.length;
		this.applyStage(animate, nextIndex, this.stageIndex);
		return true;
	}

	/**
	 * A manual (checkbox) selection is taking over playback. Re-anchors the
	 * stage index to wherever `name` actually lives so a subsequent
	 * `advance()` continues from there, rather than from whatever stage
	 * auto-advance last left off at. If `name` isn't part of any stage, the
	 * stage index is left untouched.
	 */
	takeManualControl(animate: Animate, name: string) {
		this.manualOverride = true;

		const index = animate.groups.findIndex((group) =>
			group.some((entry) => entry.animations.some((a) => a.name === name))
		);
		if (index !== -1) {
			this.stageIndex = index;
		}
	}

	private applyStage(
		animate: Animate,
		stageIndex: number,
		fromStageIndex?: number
	) {
		const bypass =
			fromStageIndex !== undefined
				? this.outgoingBypass(animate, fromStageIndex)
				: [];
		const stop = this.stopAnimation(animate, stageIndex);

		this.stageIndex = stageIndex;
		this.sequence = stop
			? [...bypass, { animationName: stop.name, loop: true }]
			: bypass;
	}

	private stopAnimation(
		animate: Animate,
		stageIndex: number
	): SpineAnimation | undefined {
		const stopEntry = animate.groups[stageIndex]?.[0];
		if (!stopEntry) {
			return undefined;
		}
		return this.pickCycleAlternate(`${stageIndex}-0`, stopEntry.animations);
	}

	private outgoingBypass(
		animate: Animate,
		stageIndex: number
	): BondSequenceStep[] {
		const group = animate.groups[stageIndex] ?? [];
		return group.slice(1).map((entry, i) => {
			const entryIndex = i + 1;
			const chosen = this.pickCycleAlternate(
				`${stageIndex}-${entryIndex}`,
				entry.animations
			);
			return { animationName: chosen.name, loop: false };
		});
	}

	private pickCycleAlternate(
		key: string,
		alternates: SpineAnimation[]
	): SpineAnimation {
		if (alternates.length === 1) {
			return alternates[0];
		}

		const idx = (this.cycleAlternateState.get(key) ?? 0) % alternates.length;
		this.cycleAlternateState.set(key, idx + 1);
		return alternates[idx];
	}
}
