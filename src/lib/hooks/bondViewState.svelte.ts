import type { Animate } from "$lib/core/animate";
import { getEligibleAnimationNames } from "$lib/core/heroAnimations";
import { getEligibleSkillAnimationNames } from "$lib/core/skillAnimations";
import { buildBondAnimate } from "$lib/core/bondAnimate";
import { BondSequencer, type BondSequenceStep } from "$lib/core/bondSequencer";
import { computeBarProgress } from "$lib/core/bondProgress";
import type { ModelView } from "$lib/core/types";
import type { AnimationState, SkeletonData } from "@esotericsoftware/spine-core";

export class BondViewState {
	stageIndex: number = $state(0);
	stageCount: number = $state(0);
	sequenceBars: BondSequenceStep[] = $state([]);
	manualOverride: boolean = $state(false);
	activeBarIndex: number = $state(-1);
	barProgress: number = $state(0);
	autoPlay: boolean = $state(false);
	frozen: boolean = $state(false);
	stillsIndex: number = $state(0);

	sequencer = new BondSequencer();
	lastSkeletonData?: SkeletonData;

	syncMeta(animate: Animate) {
		this.stageIndex = this.sequencer.stageIndex;
		this.stageCount = animate.groups.length;
		this.manualOverride = this.sequencer.manualOverride;
		if (!this.manualOverride) {
			this.sequenceBars = this.sequencer.sequence;
		}
	}

	stageMap(
		skeletonData: SkeletonData | undefined,
		view: ModelView,
		skelName: string
	): Map<string, number> | undefined {
		if (!skeletonData) {
			return undefined;
		}

		if (view === "hero" || view === "alt") {
			return this.namesToMap(
				getEligibleAnimationNames(skeletonData.animations, skelName)
			);
		}

		if (view === "skill") {
			return this.namesToMap(
				getEligibleSkillAnimationNames(skeletonData.animations)
			);
		}

		if (view !== "bond") {
			return undefined;
		}

		return buildBondAnimate(skeletonData.animations, skelName).animate.stageByName;
	}

	private namesToMap(names: string[]): Map<string, number> {
		return new Map(names.map((name, index) => [name, index]));
	}

	currentCheckboxAnimation(animationState: AnimationState): string | undefined {
		if (this.sequencer.manualOverride) {
			return undefined;
		}

		return animationState.getCurrent(0)?.animation?.name;
	}

	updatePlaybackProgress(animationState: AnimationState, view: ModelView) {
		if (view !== "bond") {
			return;
		}

		const current = animationState.getCurrent(0);
		if (this.manualOverride) {
			// single bar for the checkbox-selected animation, not the auto sequence
			this.sequenceBars = current?.animation
				? [{ animationName: current.animation.name, loop: true }]
				: [];
		} else {
			this.sequenceBars = this.sequencer.sequence;
		}

		const { activeBarIndex, progress } = computeBarProgress(
			this.sequenceBars,
			current?.animation
				? {
						animationName: current.animation.name,
						trackTime: current.trackTime,
						duration: current.animation.duration,
					}
				: undefined
		);
		this.activeBarIndex = activeBarIndex;
		this.barProgress = progress;
	}
}
