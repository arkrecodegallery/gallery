import { store } from "./state.svelte";
import { Animate } from "$lib/core/animate";
import { getBondRule } from "$lib/core/bondRules";
import { BondSequencer, type BondSequenceStep } from "$lib/core/bondSequencer";
import { computeBarProgress } from "$lib/core/bondProgress";
import type { AnimationState, SkeletonData } from "@esotericsoftware/spine-core";

export class BondViewState {
	stageIndex: number = $state(0);
	stageCount: number = $state(0);
	sequenceBars: BondSequenceStep[] = $state([]);
	manualOverride: boolean = $state(false);
	activeBarIndex: number = $state(-1);
	barProgress: number = $state(0);
	autoPlay: boolean = $state(false);
	stillsIndex: number = $state(0);

	sequencer = new BondSequencer();
	lastSkeletonData?: SkeletonData;

	syncMeta(animate: Animate) {
		this.stageIndex = this.sequencer.stageIndex;
		this.stageCount = animate.groups.length;
		this.sequenceBars = this.sequencer.sequence;
		this.manualOverride = this.sequencer.manualOverride;
	}

	stageMap(heroId: string): Map<string, number> | undefined {
		if (store.view !== "bond" || !store.skeletonData) {
			return undefined;
		}

		const rule = getBondRule(heroId);
		if (rule.disable) {
			return undefined;
		}

		return new Animate(store.skeletonData.animations, rule).stageByName;
	}

	currentCheckboxAnimation(
		animationState: AnimationState,
		heroId: string
	): string | undefined {
		const rule = getBondRule(heroId);
		if (rule.disable || this.sequencer.manualOverride) {
			return undefined;
		}

		return animationState.getCurrent(0)?.animation?.name;
	}

	updatePlaybackProgress(animationState: AnimationState) {
		if (store.view !== "bond" || this.manualOverride) {
			return;
		}

		const current = animationState.getCurrent(0);
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
