import type { BondViewState } from "./bondViewState.svelte";
import { buildBondAnimate } from "$lib/core/bondAnimate";
import { BOND_BACKGROUND_TRACK, clearStaleBondTracks } from "$lib/core/bondBackground";
import type { Animation } from "$lib/core/types";
import type {
	AnimationState,
	Skeleton,
	SkeletonData,
} from "@esotericsoftware/spine-core";

export class BondSequenceActions {
	constructor(private state: BondViewState) {}

	// user-invoked "e": also cancels auto-play/frozen, since this is a fresh
	// manual decision that overrides whatever mode was previously active
	advanceStage(skeletonData: SkeletonData | undefined, skelName: string): boolean {
		if (!skeletonData) {
			return false;
		}

		this.state.autoPlay = false;
		this.state.frozen = false;
		return this.advanceSequencer(skeletonData, skelName);
	}

	// BondAutoPlay's own internal step while "q mode" is running - must NOT
	// touch autoPlay, or auto-play would cancel itself after one stage
	advanceStageAuto(skeletonData: SkeletonData | undefined, skelName: string): boolean {
		if (!skeletonData) {
			return false;
		}

		return this.advanceSequencer(skeletonData, skelName);
	}

	private advanceSequencer(skeletonData: SkeletonData, skelName: string): boolean {
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

		this.state.frozen = false;

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
		this.state.autoPlay = false;

		if (checked) {
			this.state.frozen = false;
			this.state.sequencer.manualOverride = true;
			this.takeManualControl(skeletonData, skelName, name);
			return;
		}

		// unchecking freezes whatever is currently playing at that exact frame,
		// rather than resuming auto-play or going blank
		this.state.frozen = true;
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
			this.state.frozen = false;
			this.state.backgroundAnimationName = undefined;
			this.state.backgroundTrackClaimedByMain = false;
		}

		if (this.state.frozen) {
			const current = animationState.getCurrent(0);
			if (current) {
				current.timeScale = 0;
			}
			return [];
		}

		if (isNewSkeleton) {
			const { rule, animate } = buildBondAnimate(skeletonData.animations, skelName);
			this.state.sequencer.enterStage(animate, 0);
			this.state.syncMeta(animate);
			this.state.currentBondRule = rule;
			this.state.defaultBackgroundName = animate.background[0]?.name;
		}

		const mainEntries = this.state.sequencer.manualOverride
			? manualAnimations()
			: this.state.sequencer.sequence.map((step) => ({
					trackIndex: 0,
					animationName: step.animationName,
					loop: step.loop,
				}));

		// the background track is normally owned by ModelFrameSync.updateBondBackground,
		// which mutates it directly and independently of this rebuild - kept out of the
		// clear here whenever it's actively playing, so it survives unrelated stage/
		// checkbox changes uninterrupted. A checkbox multi-select can also claim that
		// same index though (backgroundTrackClaimedByMain), in which case it's just a
		// normal main-track entry and ModelFrameSync must leave it alone this frame.
		const keepIndices = mainEntries.map((entry) => entry.trackIndex);
		this.state.backgroundTrackClaimedByMain = keepIndices.includes(BOND_BACKGROUND_TRACK);
		if (this.state.backgroundAnimationName !== undefined) {
			keepIndices.push(BOND_BACKGROUND_TRACK);
		}
		clearStaleBondTracks(animationState, keepIndices);
		skeleton.setToSetupPose();

		return mainEntries;
	}
}
