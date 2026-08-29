import type { Animation as SpineAnimation } from "@esotericsoftware/spine-core";
import type { Animate } from "./animate";

export interface BondSequenceStep {
	animationName: string;
	loop: boolean;
}

export const CHAIN_ANIMATION_VARIANTS = true;

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

	takeManualControl(animate: Animate, name: string, orderedNames: string[] = []) {
		this.manualOverride = true;

		const stage = this.resolveStage(animate, name, orderedNames);
		if (stage !== undefined) {
			this.stageIndex = stage;
		}
	}

	/** Exact stage if the pick has one, else the nearest stage before it. */
	private resolveStage(
		animate: Animate,
		name: string,
		orderedNames: string[]
	): number | undefined {
		const direct = animate.stageByName.get(name);
		if (direct !== undefined) {
			return direct;
		}

		const index = orderedNames.indexOf(name);
		for (let i = index - 1; i >= 0; i--) {
			const stage = animate.stageByName.get(orderedNames[i]);
			if (stage !== undefined) {
				return stage;
			}
		}
		return undefined;
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

		const { sequence, loopChain } = this.buildEnteringSequence(
			stageIndex,
			stopAnimations,
			bypass
		);
		this.sequence = sequence;
		this.loopChain = loopChain;
	}

	private buildEnteringSequence(
		stageIndex: number,
		stopAnimations: SpineAnimation[],
		bypass: BondSequenceStep[]
	): { sequence: BondSequenceStep[]; loopChain: string[] } {
		if (CHAIN_ANIMATION_VARIANTS && stopAnimations.length > 1) {
			return {
				loopChain: stopAnimations.map((a) => a.name),
				sequence: [
					...bypass,
					...stopAnimations.map((animation) => ({
						animationName: animation.name,
						loop: false,
					})),
				],
			};
		}

		const stop =
			stopAnimations.length > 0
				? this.pickCycleAlternate(`${stageIndex}-0`, stopAnimations)
				: undefined;
		return {
			loopChain: [],
			sequence: stop
				? [...bypass, { animationName: stop.name, loop: true }]
				: bypass,
		};
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
