import { store } from "./state.svelte";
import type { SkinState } from "./skinState.svelte";
import type { HeroViewState } from "./heroViewState.svelte";
import type { SkillViewState } from "./skillViewState.svelte";
import type { BondSequenceActions } from "./bondSequenceActions";
import type { ModelFrameSync } from "./modelFrameSync";
import type { HeroSelection } from "./heroSelection.svelte";
import type { CheckboxAnimationState } from "./checkboxAnimations.svelte";
import type { UpdateFlags } from "./updateFlags";
import type { ModelNavigation } from "./modelNavigation";
import { keybinds, addKeydownListener } from "$lib/core/keybinds.svelte";

export class ModelInputHandler {
	constructor(
		private skinState: SkinState,
		private heroAnimation: HeroViewState,
		private skillView: SkillViewState,
		private bondActions: BondSequenceActions,
		private frameSync: ModelFrameSync,
		private heroSelection: HeroSelection,
		private checkboxAnimations: CheckboxAnimationState,
		private updateFlags: UpdateFlags,
		private navigation: ModelNavigation
	) {
		addKeydownListener((ev) => {
			this.handleSkinChange(ev.key);
			this.handleAnimationChange(ev.key);
			this.navigation.handleModelChange(ev.key);
		});
	}

	handleSkinChange(key: string) {
		if (store.view !== "hero" && store.view !== "alt") return;

		switch (key) {
			case keybinds.Skin_Decrement:
				this.skinState.decrement();
				this.updateFlags.requestSkinUpdate();
				break;
			case keybinds.Skin_Increment:
				this.skinState.increment();
				this.updateFlags.requestSkinUpdate();
				break;
		}

		if (this.updateFlags.skinUpdate) {
			this.skinState.calculateSkin(store.view, store.skeletonData);
		}
	}

	handleAnimationChange(key: string) {
		const heroFamily = store.view === "hero" || store.view === "alt";

		switch (key) {
			case keybinds.Cutscene:
				if (heroFamily && store.skeletonData) {
					if (
						this.heroAnimation.cycleSelection(
							store.skeletonData,
							this.heroSelection.resolveSkelName()!
						)
					) {
						this.updateFlags.requestAnimationUpdate();
					}
				} else if (store.view === "skill") {
					this.skillView.requestCutscene();
					this.updateFlags.requestAnimationUpdate();
				} else if (store.view === "bond") {
					const entry = this.heroSelection.getAbsoluteEntry();
					const presentation = entry.bond![this.heroSelection.cycleIndex];
					if (presentation.kind === "animated") {
						this.applyBondUpdate(() => this.frameSync.startBondAutoPlay());
					}
				}
				break;
			case keybinds.Touch:
				if (heroFamily && store.skeletonData) {
					if (
						this.heroAnimation.playSelected(
							store.skeletonData,
							this.heroSelection.resolveSkelName()!
						)
					) {
						this.updateFlags.requestAnimationUpdate();
					}
				} else if (store.view === "skill") {
					this.skillView.requestTouch();
					this.updateFlags.requestAnimationUpdate();
				} else if (store.view === "bond") {
					const entry = this.heroSelection.getAbsoluteEntry();
					const presentation = entry.bond![this.heroSelection.cycleIndex];
					if (presentation.kind === "stills") {
						this.bondActions.advanceStills(presentation.images.length);
					} else if (presentation.kind === "animated") {
						this.checkboxAnimations.clear();
						this.applyBondUpdate(() => this.frameSync.advanceBondStage());
					}
				}
				break;
		}
	}

	setAnimationChecked(name: string, checked: boolean, additive = false) {
		if (store.view === "bond") {
			this.bondActions.handleCheckboxSelect(
				store.skeletonData,
				this.heroSelection.resolveSkelName()!,
				name,
				checked
			);
		} else if ((store.view === "hero" || store.view === "alt") && store.skeletonData) {
			this.heroAnimation.setChecked(
				store.skeletonData,
				name,
				checked,
				this.heroSelection.resolveSkelName()!
			);
		} else if (store.view === "skill") {
			this.skillView.setChecked(name, checked);
		}

		this.checkboxAnimations.setChecked(name, checked, additive);
		this.updateFlags.requestAnimationUpdate();
		this.updateFlags.requestSkinUpdate();
	}

	setStillsChecked(index: number) {
		this.bondActions.setStillsIndex(index);
	}

	confirmManualSkinPick() {
		this.skinState.confirmManualPick();
		this.updateFlags.requestSkinUpdate();
	}

	private applyBondUpdate(action: () => boolean) {
		if (action()) {
			this.updateFlags.requestAnimationUpdate();
			this.updateFlags.requestSkinUpdate();
		}
	}
}
