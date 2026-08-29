import type { BondViewState } from "./bondViewState.svelte";
import { buildBondAnimate } from "$lib/core/bondAnimate";
import type { Animation } from "$lib/core/types";
import type {
	AnimationState,
	Skeleton,
	SkeletonData,
} from "@esotericsoftware/spine-core";

export class BondSequenceActions {
	constructor(private state: BondViewState) {}

	advanceStage(skeletonData: SkeletonData | undefined, skelName: string): boolean {
		if (!skeletonData) {
			return false;
		}

		const { animate } = buildBondAnimate(skeletonData.animations, skelName);
		if (!this.state.sequencer.advance(animate)) {
			return false;
		}
		this.state.syncMeta(animate);
		return true;
	}

	startAutoPlay(skeletonData: SkeletonData | undefined, skelName: string): boolean {
		if (!skeletonData) {
			return false;
		}

		const { animate } = buildBondAnimate(skeletonData.animations, skelName);
		this.state.sequencer.enterStage(animate, 0);
		this.state.autoPlay = true;
		this.state.syncMeta(animate);
		return true;
	}

	advanceStills(imageCount: number) {
		this.state.stillsIndex += 1;
		if (this.state.stillsIndex === imageCount) {
			this.state.stillsIndex = 0;
		}
	}

	setStillsIndex(index: number) {
		this.state.stillsIndex = index;
	}

	takeManualControl(
		skeletonData: SkeletonData | undefined,
		skelName: string,
		name: string
	) {
		if (!skeletonData) {
			return;
		}

		const { animate } = buildBondAnimate(skeletonData.animations, skelName);
		const orderedNames = skeletonData.animations.map((a) => a.name);
		this.state.sequencer.takeManualControl(animate, name, orderedNames);
		this.state.syncMeta(animate);
	}

	handleCheckboxSelect(
		skeletonData: SkeletonData | undefined,
		skelName: string,
		name: string,
		checked: boolean
	) {
		this.state.sequencer.manualOverride = true;
		this.state.autoPlay = false;

		if (checked) {
			this.takeManualControl(skeletonData, skelName, name);
		}
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skeleton: Skeleton,
		skelName: string,
		manualAnimations: () => Animation[]
	): Animation[] {
		const isNewSkeleton = this.state.lastSkeletonData !== skeletonData;
		if (isNewSkeleton) {
			this.state.lastSkeletonData = skeletonData;
			this.state.sequencer.reset();
			this.state.autoPlay = false;
		}

		animationState.clearTracks();
		skeleton.setToSetupPose();

		if (isNewSkeleton) {
			const { animate } = buildBondAnimate(skeletonData.animations, skelName);
			this.state.sequencer.enterStage(animate, 0);
			this.state.syncMeta(animate);
		}

		if (this.state.sequencer.manualOverride) {
			return manualAnimations();
		}

		return this.state.sequencer.sequence.map((step) => ({
			trackIndex: 0,
			animationName: step.animationName,
			loop: step.loop,
		}));
	}
}
