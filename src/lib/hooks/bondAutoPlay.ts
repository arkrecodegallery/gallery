import type { BondViewState } from "./bondViewState.svelte";
import type { BondSequenceActions } from "./bondSequenceActions";
import { buildBondAnimate } from "$lib/core/bondAnimate";
import type { ModelView } from "$lib/core/types";
import type {
	AnimationState,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";

export class BondAutoPlay {
	constructor(
		private state: BondViewState,
		private actions: BondSequenceActions,
		private requestUpdate: () => void
	) {}

	handleAnimationComplete(
		entry: TrackEntry,
		animationState: AnimationState,
		view: ModelView,
		skeletonData: SkeletonData | undefined,
		skelName: string
	) {
		if (this.tryAdvance(entry, view, skeletonData, skelName)) {
			return;
		}
		this.handleLoopComplete(entry, animationState, view);
	}

	private tryAdvance(
		entry: TrackEntry,
		view: ModelView,
		skeletonData: SkeletonData | undefined,
		skelName: string
	): boolean {
		if (
			view !== "bond" ||
			!this.state.autoPlay ||
			this.state.manualOverride ||
			entry.next !== null ||
			!skeletonData
		) {
			return false;
		}

		const { animate } = buildBondAnimate(skeletonData.animations, skelName);
		if (this.state.sequencer.stageIndex >= animate.groups.length - 1) {
			this.state.autoPlay = false;
			return false;
		}

		if (!this.actions.advanceStage(skeletonData, skelName)) {
			return false;
		}
		this.requestUpdate();
		return true;
	}

	private handleLoopComplete(
		entry: TrackEntry,
		animationState: AnimationState,
		view: ModelView
	) {
		if (view !== "bond" || this.state.manualOverride) {
			return;
		}

		const chain = this.state.sequencer.loopChain;
		if (chain.length === 0 || entry.next !== null) {
			return;
		}
		if (entry.animation?.name !== chain[chain.length - 1]) {
			return;
		}

		for (const name of chain) {
			animationState.addAnimation(0, name, false);
		}
	}
}
