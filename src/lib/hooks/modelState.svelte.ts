import { store } from "./state.svelte";
import type {
	Animation,
	BondPresentation,
	Bundle,
	Entry,
	ModelView,
} from "../core/types";
import {
	applyCheckboxSelection,
	reconcileSingleCheckbox,
} from "$lib/core/checkboxSelection";
import type {
	AnimationState,
	Skeleton,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { keybinds, addKeydownListener } from "$lib/core/keybinds.svelte";
import { BondViewState } from "./bondViewState.svelte";
import { BondSequenceActions } from "./bondSequenceActions";
import { BondAutoPlay } from "./bondAutoPlay";
import { HeroViewState } from "./heroViewState.svelte";
import { SkillViewState } from "./skillViewState.svelte";
import { SkinState } from "./skinState.svelte";
import { skelName } from "$lib/core/skelName";

function fromLocalStorage(item: string): number {
	const value = localStorage.getItem(item);
	return !!value ? JSON.parse(value) : 0;
}

export class ModelState {
	absoluteHeroIndex: number = $state(fromLocalStorage("absoluteHeroIndex"));
	relativeHeroIndex: number = $state(fromLocalStorage("relativeHeroIndex"));

	skinUpdate: boolean = false;

	animations: Record<string, number> = $state({});
	animationUpdate: boolean = false;

	cycleIndex: number = $state(0);
	modelUpdate: boolean = false;

	public readonly skinState = new SkinState();
	public readonly skillView = new SkillViewState();
	public readonly bond = new BondViewState();
	public readonly heroAnimation = new HeroViewState();
	private bondActions = new BondSequenceActions(this.bond);
	private bondAutoPlay = new BondAutoPlay(this.bond, this.bondActions, () => {
		this.animationUpdate = true;
		this.skinUpdate = true;
	});

	constructor() {
		addKeydownListener((ev) => {
			this.handleSkinChange(ev.key);
			this.handleAnimationChange(ev.key);
			this.handleModelChange(ev.key);
		});
	}

	handleSkinChange(key: string) {
		if (store.view !== "hero" && store.view !== "alt") return;

		switch (key) {
			case keybinds.Skin_Decrement:
				this.skinState.decrement();
				this.skinUpdate = true;
				break;
			case keybinds.Skin_Increment:
				this.skinState.increment();
				this.skinUpdate = true;
				break;
		}

		if (this.skinUpdate) {
			this.calculateSkin();
		}
	}

	public hasSkinUpdate(): boolean {
		const update = this.skinUpdate;
		this.skinUpdate = false;
		return update;
	}

	public calculateSkin() {
		this.skinState.calculateSkin(store.view, store.skeletonData);
	}

	public getSkin(skeletonData: SkeletonData): string {
		return this.skinState.getSkin();
	}

	public confirmManualSkinPick() {
		this.skinState.confirmManualPick();
		this.skinUpdate = true;
	}

	handleAnimationChange(key: string) {
		const heroFamily = store.view === "hero" || store.view === "alt";

		switch (key) {
			case keybinds.Cutscene:
				if (heroFamily && store.skeletonData) {
					this.heroAnimation.cycleSelection(store.skeletonData, this.resolveSkelName()!);
				} else if (store.view === "skill") {
					this.skillView.requestCutscene();
					this.animationUpdate = true;
				} else if (store.view === "bond") {
					const entry = this.getAbsoluteEntry();
					const presentation = entry.bond![this.cycleIndex];
					if (presentation.kind === "animated") {
						this.startBondAutoPlay();
					}
				}
				break;
			case keybinds.Touch:
				if (heroFamily && store.skeletonData) {
					if (
						this.heroAnimation.playSelected(store.skeletonData, this.resolveSkelName()!)
					) {
						this.animationUpdate = true;
					}
				} else if (store.view === "skill") {
					this.skillView.requestTouch();
					this.animationUpdate = true;
				} else if (store.view === "bond") {
					const entry = this.getAbsoluteEntry();
					const presentation = entry.bond![this.cycleIndex];
					if (presentation.kind === "stills") {
						this.bondActions.advanceStills(presentation.images.length);
					} else if (presentation.kind === "animated") {
						this.advanceBondStage();
					}
				}
				break;
		}
	}

	public hasAnimationUpdate(): boolean {
		const update = this.animationUpdate;
		this.animationUpdate = false;
		return update;
	}

	public animationStageMap(): Map<string, number> | undefined {
		return this.bond.stageMap(
			store.skeletonData,
			store.view,
			this.resolveSkelName()!
		);
	}

	public getBondPresentation(): BondPresentation | undefined {
		if (store.view !== "bond") return undefined;
		return this.getAbsoluteEntry().bond?.[this.cycleIndex];
	}

	public setStillsChecked(index: number) {
		this.bondActions.setStillsIndex(index);
	}

	public setAnimationChecked(name: string, checked: boolean, additive = false) {
		if (store.view === "bond") {
			this.bondActions.handleCheckboxSelect(
				store.skeletonData,
				this.resolveSkelName()!,
				name,
				checked
			);
		} else if (
			(store.view === "hero" || store.view === "alt") &&
			store.skeletonData
		) {
			this.heroAnimation.setChecked(
				store.skeletonData,
				name,
				checked,
				this.resolveSkelName()!
			);
		} else if (store.view === "skill") {
			this.skillView.setChecked(name, checked);
		}

		this.animations = applyCheckboxSelection(this.animations, name, checked, additive);
		this.animationUpdate = true;
		this.skinUpdate = true;
	}

	public advanceBondStage() {
		if (this.bondActions.advanceStage(store.skeletonData, this.resolveSkelName()!)) {
			this.animationUpdate = true;
			this.skinUpdate = true;
		}
	}

	public startBondAutoPlay() {
		if (this.bondActions.startAutoPlay(store.skeletonData, this.resolveSkelName()!)) {
			this.animationUpdate = true;
			this.skinUpdate = true;
		}
	}

	private manualBondAnimations(): Animation[] {
		return Object.entries(this.animations).map(([animationName, trackIndex]) => ({
			animationName,
			trackIndex,
			loop: true,
		}));
	}

	public syncBondCheckboxState(animationState: AnimationState) {
		if (store.view !== "bond") {
			return;
		}

		const current = this.bond.currentCheckboxAnimation(animationState);
		this.animations = reconcileSingleCheckbox(this.animations, current, false);
	}

	public syncHeroCheckboxState() {
		if (store.view !== "hero" && store.view !== "alt") {
			return;
		}

		const current = this.heroAnimation.currentClipName();
		this.animations = reconcileSingleCheckbox(this.animations, current, true);
	}

	public syncSkillCheckboxState(animationState: AnimationState) {
		if (store.view !== "skill" || !store.skeletonData) {
			return;
		}

		const current = this.skillView.currentCheckboxAnimation(
			animationState,
			store.skeletonData
		);
		this.animations = reconcileSingleCheckbox(this.animations, current, true);
	}

	public updateBondPlaybackProgress(animationState: AnimationState) {
		this.bond.updatePlaybackProgress(animationState, store.view);
	}

	public updateHeroAnimationProgress(animationState: AnimationState) {
		if (store.view !== "hero" && store.view !== "alt") {
			return;
		}
		this.heroAnimation.updatePlaybackProgress(animationState);
	}

	public updateSkillPlaybackProgress(animationState: AnimationState) {
		if (store.view !== "skill") {
			return;
		}
		this.skillView.updatePlaybackProgress(animationState);
	}

	/** Runs every per-view checkbox/progress sync once per frame, in render order. */
	public syncFrame(animationState: AnimationState) {
		this.syncBondCheckboxState(animationState);
		this.syncHeroCheckboxState();
		this.syncSkillCheckboxState(animationState);
		this.updateBondPlaybackProgress(animationState);
		this.updateHeroAnimationProgress(animationState);
		this.updateSkillPlaybackProgress(animationState);
	}

	public handleBondAnimationComplete(
		entry: TrackEntry,
		animationState: AnimationState
	) {
		this.bondAutoPlay.handleAnimationComplete(
			entry,
			animationState,
			store.view,
			store.skeletonData,
			this.resolveSkelName()!
		);
	}

	public getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skeleton: Skeleton
	): Animation[] {
		if (store.view === "bond") {
			return this.bondActions.getAnimation(
				skeletonData,
				animationState,
				skeleton,
				this.resolveSkelName()!,
				() => this.manualBondAnimations()
			);
		}

		if (store.view === "hero" || store.view === "alt") {
			return this.heroAnimation.getAnimation(
				skeletonData,
				animationState,
				this.resolveSkelName()!
			);
		}

		return this.skillView.getAnimation(skeletonData, animationState);
	}

	handleModelChange(key: string, modelSwitch = false, viewSwitch = false) {
		let prevView: ModelView = store.view;

		const first = 0;
		let prev = this.relativeHeroIndex - 1;
		for (; prev >= first; prev--) {
			const id = store.filteredHeroData[prev].id;
			if (!!store.map[id]) {
				break;
			}
		}

		const last = store.filteredHeroData.length - 1;
		let next = this.relativeHeroIndex + 1;
		for (; next <= last; next++) {
			const id = store.filteredHeroData[next].id;
			if (!!store.map[id]) {
				break;
			}
		}

		switch (key) {
			case keybinds.Hero_Decrement:
				this.relativeHeroIndex = prev < first ? last : prev;
				modelSwitch = true;
				break;
			case keybinds.Hero_Increment:
				this.relativeHeroIndex = next > last ? first : next;
				modelSwitch = true;
				break;
			case keybinds.Hero_View:
				if (store.view === "hero") {
					store.view = "alt";
				} else {
					store.view = "hero";
				}
				viewSwitch = true;
				break;
			case keybinds.Skill_View:
				store.view = "skill";
				viewSwitch = true;
				break;
			case keybinds.Bond_View:
				store.view = "bond";
				viewSwitch = true;
				break;
			case keybinds.Collection_View:
				store.view = "collection";
				viewSwitch = true;
				break;
		}

		const entry = store.filteredHeroData[this.relativeHeroIndex];
		if (modelSwitch) {
			this.absoluteHeroIndex = Object.values(store.map).findIndex(
				(h) => h.id === entry.id
			);

			if (store.view === "collection") {
				if ((entry.collection ?? []).length === 0) {
					store.view = "hero";
				}
			} else {
				const bundle = this.getBundle(entry, store.view);
				if (!bundle) {
					store.view = "hero";
				}
				store.loading = true;
			}

			this.modelUpdate = true;
			this.skinState.skinLevel = 1;
			this.cycleIndex = 0;
		} else if (viewSwitch) {
			if (store.view === "bond") {
				if ((entry.bond ?? []).length === 0) {
					store.view = prevView;
					return;
				}

				if (prevView === "bond") {
					const prevIndex = this.cycleIndex;
					this.cycleIndex += 1;
					if (this.cycleIndex === entry.bond!.length) {
						this.cycleIndex = 0;
					}
					if (prevIndex === this.cycleIndex) {
						return;
					}
				} else {
					this.cycleIndex = 0;
				}

				if (!!this.getBundle(entry, store.view)) {
					this.modelUpdate = true;
				}

				store.loading = true;
				return;
			} else if (store.view === "collection") {
				if ((entry.collection ?? []).length === 0) {
					store.view = prevView;
				} else if (prevView === "collection") {
					this.cycleIndex += 1;
					if (this.cycleIndex === entry.collection!.length) {
						this.cycleIndex = 0;
					}
				} else {
					this.cycleIndex = 0;
				}

				store.loading = true;
				return;
			} else if (prevView === store.view) {
				// nothing to update
				return;
			}

			const bundle = this.getBundle(entry, store.view);
			if (!bundle) {
				store.view = prevView;
			} else {
				this.modelUpdate = true;
				this.cycleIndex = 0;
			}
		}
	}

	public hasModelUpdate() {
		const update = this.modelUpdate;
		this.modelUpdate = false;
		return update;
	}

	public getAbsoluteEntry(): Entry {
		return this.entry(this.absoluteHeroIndex);
	}

	public selectHeroById(id: string) {
		this.absoluteHeroIndex =
			Object.values(store.map).findIndex((h) => h.id === id) ?? 0;
		this.relativeHeroIndex =
			store.filteredHeroData.findIndex((h) => h.id === id) ?? 0;
		this.handleModelChange("", true);
	}

	/** The skel name backing the currently displayed view; only defined for hero/alt/bond. */
	private resolveSkelName(): string | undefined {
		const entry = this.getAbsoluteEntry();
		switch (store.view) {
			case "hero":
				return skelName(entry.hero.skel);
			case "alt":
				return entry.alt && skelName(entry.alt.skel);
			case "bond": {
				const presentation = entry.bond?.[this.cycleIndex];
				return presentation?.kind === "animated"
					? skelName(presentation.bundle.skel)
					: undefined;
			}
			default:
				return undefined;
		}
	}

	public viewDisabled(view: ModelView): boolean {
		const entry = this.getAbsoluteEntry();

		switch (view) {
			case "hero":
				return false; // always available
			case "alt":
				return entry.alt === undefined;
			case "skill":
				return entry.skill === undefined;
			case "bond":
				return entry.bond === undefined;
			case "collection":
				return entry.collection === undefined;
		}
	}

	entry(index: number): Entry {
		return Object.values(store.map)[index];
	}

	getBundle(entry: Entry, view: ModelView) {
		switch (view) {
			case "hero":
				return entry.hero;
			case "alt":
				return entry.alt;
			case "skill":
				return entry.skill;
			case "bond":
				return entry.bond?.[this.cycleIndex];
			default:
				throw new Error("Unreachable code");
		}
	}
}
