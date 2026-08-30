import { store } from "./state.svelte";
import type { BondViewState } from "./bondViewState.svelte";
import type { BondSequenceActions } from "./bondSequenceActions";
import type { BondAutoPlay } from "./bondAutoPlay";
import type { HeroViewState } from "./heroViewState.svelte";
import type { SkillViewState } from "./skillViewState.svelte";
import type { HeroSelection } from "./heroSelection.svelte";
import type { CheckboxAnimationState } from "./checkboxAnimations.svelte";
import { BOND_BACKGROUND_TRACK } from "$lib/core/bondBackground";
import type { Animation, BondPresentation } from "$lib/core/types";
import type {
	AnimationState,
	Skeleton,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";

export class ModelFrameSync {
	constructor(
		private bond: BondViewState,
		private bondActions: BondSequenceActions,
		private bondAutoPlay: BondAutoPlay,
		private heroAnimation: HeroViewState,
		private skillView: SkillViewState,
		private heroSelection: HeroSelection,
		private checkboxAnimations: CheckboxAnimationState
	) {}

	getBondPresentation(): BondPresentation | undefined {
		if (store.view !== "bond") return undefined;
		return this.heroSelection.getAbsoluteEntry().bond?.[this.heroSelection.cycleIndex];
	}

	animationStageMap(): Map<string, number> | undefined {
		return this.bond.stageMap(
			store.skeletonData,
			store.view,
			this.heroSelection.resolveSkelName()!
		);
	}

	advanceBondStage(): boolean {
		return this.bondActions.advanceStage(
			store.skeletonData,
			this.heroSelection.resolveSkelName()!
		);
	}

	startBondAutoPlay(): boolean {
		return this.bondActions.startAutoPlay(
			store.skeletonData,
			this.heroSelection.resolveSkelName()!
		);
	}

	/** Runs every per-view checkbox/progress sync once per frame, in render order. */
	syncFrame(animationState: AnimationState) {
		this.syncBondCheckboxState(animationState);
		this.syncHeroCheckboxState();
		this.syncSkillCheckboxState(animationState);
		this.updateBondPlaybackProgress(animationState);
		this.updateBondBackground(animationState);
		this.updateHeroAnimationProgress(animationState);
		this.updateSkillPlaybackProgress(animationState);
	}

	handleBondAnimationComplete(entry: TrackEntry, animationState: AnimationState) {
		this.bondAutoPlay.handleAnimationComplete(
			entry,
			animationState,
			store.view,
			store.skeletonData,
			this.heroSelection.resolveSkelName()!
		);
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skeleton: Skeleton
	): Animation[] {
		if (store.view === "bond") {
			return this.bondActions.getAnimation(
				skeletonData,
				animationState,
				skeleton,
				this.heroSelection.resolveSkelName()!,
				() => this.checkboxAnimations.manualAnimations()
			);
		}

		if (store.view === "hero" || store.view === "alt") {
			return this.heroAnimation.getAnimation(
				skeletonData,
				animationState,
				this.heroSelection.resolveSkelName()!
			);
		}

		return this.skillView.getAnimation(skeletonData, animationState);
	}

	private syncBondCheckboxState(animationState: AnimationState) {
		if (store.view !== "bond") return;
		const current = this.bond.currentCheckboxAnimation(animationState);
		this.checkboxAnimations.reconcile(current, false);
	}

	private syncHeroCheckboxState() {
		if (store.view !== "hero" && store.view !== "alt") return;
		const current = this.heroAnimation.currentClipName();
		this.checkboxAnimations.reconcile(current, true);
	}

	private syncSkillCheckboxState(animationState: AnimationState) {
		if (store.view !== "skill" || !store.skeletonData) return;
		const current = this.skillView.currentCheckboxAnimation(
			animationState,
			store.skeletonData
		);
		this.checkboxAnimations.reconcile(current, true);
	}

	private updateBondPlaybackProgress(animationState: AnimationState) {
		this.bond.updatePlaybackProgress(animationState, store.view);
	}

	// mutates the background track directly, independent of the main
	// track's own clear-and-rebuild cycle, so it's never restarted by
	// unrelated stage/checkbox changes - only when its own clip changes
	private updateBondBackground(animationState: AnimationState) {
		if (store.view !== "bond") return;
		// a checkbox multi-select can claim this same track index this frame -
		// getAnimation() already set/cleared it, don't fight over ownership
		if (this.bond.backgroundTrackClaimedByMain) return;

		const suppressed = Object.keys(this.checkboxAnimations.animations).length > 1;
		const changed = this.bond.updateBackgroundTrack(
			animationState,
			store.skeletonData,
			suppressed
		);
		if (!changed) return;

		const name = this.bond.backgroundAnimationName;
		if (name) {
			animationState.setAnimation(BOND_BACKGROUND_TRACK, name, true);
		} else {
			animationState.clearTrack(BOND_BACKGROUND_TRACK);
		}
	}

	private updateHeroAnimationProgress(animationState: AnimationState) {
		if (store.view !== "hero" && store.view !== "alt") return;
		this.heroAnimation.updatePlaybackProgress(animationState);
	}

	private updateSkillPlaybackProgress(animationState: AnimationState) {
		if (store.view !== "skill") return;
		this.skillView.updatePlaybackProgress(animationState);
	}
}
