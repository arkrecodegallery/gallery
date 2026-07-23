import { store } from "./state.svelte";
import type { BondViewState } from "./bondViewState.svelte";
import { Animate } from "$lib/core/animate";
import { getBondRule } from "$lib/core/bondRules";
import type { Animation } from "$lib/core/types";
import type {
	AnimationState,
	Skeleton,
	SkeletonData,
} from "@esotericsoftware/spine-core";

export class BondSequenceActions {
	constructor(private state: BondViewState) {}

	advanceStage(heroId: string): boolean {
		if (!store.skeletonData) {
			return false;
		}

		const rule = getBondRule(heroId);
		if (rule.disable) {
			return false;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		if (!this.state.sequencer.advance(animate)) {
			return false;
		}
		this.state.syncMeta(animate);
		return true;
	}

	startAutoPlay(heroId: string): boolean {
		if (!store.skeletonData) {
			return false;
		}

		const rule = getBondRule(heroId);
		if (rule.disable) {
			return false;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
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

	takeManualControl(heroId: string, name: string) {
		if (!store.skeletonData) {
			return;
		}

		const rule = getBondRule(heroId);
		if (rule.disable) {
			return;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		const orderedNames = store.skeletonData.animations.map((a) => a.name);
		this.state.sequencer.takeManualControl(animate, name, orderedNames);
		this.state.syncMeta(animate);
	}

	handleCheckboxSelect(heroId: string, name: string, checked: boolean) {
		this.state.sequencer.manualOverride = true;
		this.state.autoPlay = false;

		if (checked) {
			this.takeManualControl(heroId, name);
		}
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skeleton: Skeleton,
		heroId: string,
		manualAnimations: () => Animation[]
	): Animation[] {
		const rule = getBondRule(heroId);
		const isNewSkeleton = this.state.lastSkeletonData !== skeletonData;
		if (isNewSkeleton) {
			this.state.lastSkeletonData = skeletonData;
			this.state.sequencer.reset();
			this.state.autoPlay = false;
		}

		if (rule.disable) {
			return manualAnimations();
		}

		animationState.clearTracks();
		skeleton.setToSetupPose();

		if (isNewSkeleton) {
			const animate = new Animate(skeletonData.animations, rule);
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
