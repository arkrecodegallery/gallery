import { store } from "./state.svelte";
import type { BondViewState } from "./bondViewState.svelte";
import type { BondSequenceActions } from "./bondSequenceActions";
import { Animate } from "$lib/core/animate";
import { getBondRule } from "$lib/core/bondRules";
import type { AnimationState, TrackEntry } from "@esotericsoftware/spine-core";

export class BondAutoPlay {
	constructor(
		private state: BondViewState,
		private actions: BondSequenceActions,
		private requestUpdate: () => void
	) {}

	handleAnimationComplete(
		entry: TrackEntry,
		animationState: AnimationState,
		skelName: string
	) {
		if (this.tryAdvance(entry, skelName)) {
			return;
		}
		this.handleLoopComplete(entry, animationState);
	}

	private tryAdvance(entry: TrackEntry, skelName: string): boolean {
		if (
			store.view !== "bond" ||
			!this.state.autoPlay ||
			this.state.manualOverride ||
			entry.next !== null ||
			!store.skeletonData
		) {
			return false;
		}

		const rule = getBondRule(skelName);
		if (rule.disable) {
			this.state.autoPlay = false;
			return false;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		if (this.state.sequencer.stageIndex >= animate.groups.length - 1) {
			this.state.autoPlay = false;
			return false;
		}

		if (!this.actions.advanceStage(skelName)) {
			return false;
		}
		this.requestUpdate();
		return true;
	}

	private handleLoopComplete(entry: TrackEntry, animationState: AnimationState) {
		if (store.view !== "bond" || this.state.manualOverride) {
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
