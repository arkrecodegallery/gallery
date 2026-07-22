import type { Animation as SpineAnimation } from "@esotericsoftware/spine-core";
import type { Animate } from "./animate";

export interface BondSequenceStep {
	animationName: string;
	loop: boolean;
}

/** Off for now - stop variants pick one alternate instead of chaining. */
export const CHAIN_ANIMATION_VARIANTS = false;

export class BondSequencer {
	stageIndex = 0;
	sequence: BondSequenceStep[] = [];
	manualOverride = false;
	loopChain: string[] = [];

	private cycleAlternateState = new Map<string, number>();

	reset() {
		this.stageIndex = 0;
		this.sequence = [];
		this.manualOverride = false;
		this.loopChain = [];
		this.cycleAlternateState.clear();
	}

	enterStage(animate: Animate, stageIndex: number) {
		this.manualOverride = false;
		this.applyStage(animate, stageIndex);
	}

	advance(animate: Animate): boolean {
		if (animate.groups.length === 0) {
			return false;
		}

		this.manualOverride = false;
		const nextIndex = (this.stageIndex + 1) % animate.groups.length;
		this.applyStage(animate, nextIndex, this.stageIndex);
		return true;
	}

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
		const stopAnimations = animate.groups[stageIndex]?.[0]?.animations ?? [];

		this.stageIndex = stageIndex;

		if (CHAIN_ANIMATION_VARIANTS && stopAnimations.length > 1) {
			this.loopChain = stopAnimations.map((a) => a.name);
			this.sequence = [
				...bypass,
				...stopAnimations.map((animation) => ({
					animationName: animation.name,
					loop: false,
				})),
			];
			return;
		}

		this.loopChain = [];
		const stop =
			stopAnimations.length > 0
				? this.pickCycleAlternate(`${stageIndex}-0`, stopAnimations)
				: undefined;
		this.sequence = stop
			? [...bypass, { animationName: stop.name, loop: true }]
			: bypass;
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
