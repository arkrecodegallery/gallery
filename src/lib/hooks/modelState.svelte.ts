import { store } from "./state.svelte";
import type {
	Animation,
	BondPresentation,
	Bundle,
	Entry,
	ModelView,
} from "../core/types";
import type {
	AnimationState,
	AnimationStateListener,
	Skeleton,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { keybinds } from "$lib/core/keybinds.svelte";
import { addKeydownListener } from "$lib/utils";
import { BondViewState } from "./bondViewState.svelte";
import { BondSequenceActions } from "./bondSequenceActions";
import { BondAutoPlay } from "./bondAutoPlay";
import { HeroViewState } from "./heroViewState.svelte";
import { skelName } from "$lib/core/skelName";
import {
	POSSIBLE_IDLE_NAMES,
	findIdleAnimationName,
} from "$lib/core/idleAnimation";
import { computeBarProgress } from "$lib/core/bondProgress";
import { TOUCH_NAMES, CUTSCENE_NAMES } from "$lib/core/skillAnimations";

const POSSIBLE_BG_NAMES = [
	"90_BG",
	"90_BG2",
	"90_BG3",
	"90_BG_Loop",
	"90_Sparkle",
	"90_BG_02",
];

// dedicated track for checkbox-driven skill loops; kept well clear of
// the dynamic idle/bg/touch/cutscene track indices below
const SKILL_CHECKBOX_TRACK = 50;

function fromLocalStorage(item: string): number {
	const value = localStorage.getItem(item);
	return !!value ? JSON.parse(value) : 0;
}

export class ModelState {
	absoluteHeroIndex: number = $state(fromLocalStorage("absoluteHeroIndex"));
	relativeHeroIndex: number = $state(fromLocalStorage("relativeHeroIndex"));

	skin: string = $state("LV1");
	skinLevel: number = 1;
	skinUpdate: boolean = false;
	skipSkinCalculation: boolean = false;

	touch: boolean = false;
	cutScene: boolean = false;
	animations: Record<string, number> = $state({});
	animationUpdate: boolean = false;

	cycleIndex: number = $state(0);
	modelUpdate: boolean = false;

	skillActiveTrackIndex = 0;
	skillActiveAnimationName?: string;
	skillBarProgress: number = $state(0);
	private lastSkillSkeletonData?: SkeletonData;

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

		const cur = this.skinLevel;

		switch (key) {
			case keybinds.Skin_Decrement:
				this.skinLevel = cur === 1 ? 3 : cur - 1;
				this.skinUpdate = true;
				break;
			case keybinds.Skin_Increment:
				this.skinLevel = cur === 3 ? 1 : cur + 1;
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
		if (this.skipSkinCalculation) {
			this.skipSkinCalculation = false;
			return;
		}

		const tryApplySkin = (attempt: string, fallback: string) => {
			if (store.skeletonData?.skins.some((a) => a.name === attempt)) {
				this.skin = attempt;
			} else {
				this.skin = store.skeletonData?.skins[0].name ?? fallback;
			}
		};

		if (store.view === "hero") {
			this.skin = `LV${this.skinLevel}`;
		} else if (store.view === "alt") {
			tryApplySkin(`LV${this.skinLevel}`, "default");
		} else if (store.view === "skill" || store.view === "bond") {
			tryApplySkin("LV1", "default");
		}
	}

	public getSkin(skeletonData: SkeletonData): string {
		return this.skin;
	}

	handleAnimationChange(key: string) {
		const heroFamily = store.view === "hero" || store.view === "alt";

		switch (key) {
			case keybinds.Cutscene:
				if (heroFamily && store.skeletonData) {
					this.heroAnimation.cycleSelection(store.skeletonData, this.resolveSkelName()!);
				} else if (store.view === "skill") {
					this.cutScene = true;
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
					this.touch = true;
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
		return this.bond.stageMap(this.resolveSkelName()!);
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
			this.bondActions.handleCheckboxSelect(this.resolveSkelName()!, name, checked);
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
			this.setSkillChecked(name, checked);
		}

		if (!additive) {
			this.animations = checked ? { [name]: 0 } : {};
			this.animationUpdate = true;
			this.skinUpdate = true;
			return;
		}

		const next = { ...this.animations };
		if (checked) {
			next[name] = Object.keys(next).length;
		} else {
			delete next[name];
			Object.keys(next).forEach((key, i) => {
				next[key] = i;
			});
		}

		this.animations = next;
		this.animationUpdate = true;
		this.skinUpdate = true;
	}

	public advanceBondStage() {
		if (this.bondActions.advanceStage(this.resolveSkelName()!)) {
			this.animationUpdate = true;
			this.skinUpdate = true;
		}
	}

	public startBondAutoPlay() {
		if (this.bondActions.startAutoPlay(this.resolveSkelName()!)) {
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

		const current = this.bond.currentCheckboxAnimation(
			animationState,
			this.resolveSkelName()!
		);
		if (current === undefined) {
			return;
		}

		const keys = Object.keys(this.animations);
		if (keys.length !== 1 || keys[0] !== current) {
			this.animations = { [current]: 0 };
		}
	}

	public syncHeroCheckboxState() {
		if (store.view !== "hero" && store.view !== "alt") {
			return;
		}

		const current = this.heroAnimation.currentClipName();
		const keys = Object.keys(this.animations);
		if (current === undefined) {
			if (keys.length !== 0) {
				this.animations = {};
			}
		} else if (keys.length !== 1 || keys[0] !== current) {
			this.animations = { [current]: 0 };
		}
	}

	public syncSkillCheckboxState(animationState: AnimationState) {
		if (store.view !== "skill" || !store.skeletonData) {
			return;
		}

		// reflect the q/e one-shot clip while it's actually playing
		const oneShot =
			this.skillActiveTrackIndex !== 0
				? animationState.getCurrent(this.skillActiveTrackIndex)?.animation?.name
				: undefined;

		const current =
			oneShot ??
			this.skillActiveAnimationName ??
			findIdleAnimationName(store.skeletonData.animations);
		const keys = Object.keys(this.animations);
		if (current === undefined) {
			if (keys.length !== 0) {
				this.animations = {};
			}
		} else if (keys.length !== 1 || keys[0] !== current) {
			this.animations = { [current]: 0 };
		}
	}

	// checkbox-driven: any animation, always loops, switches freely
	private setSkillChecked(name: string, checked: boolean) {
		if (!checked) {
			if (this.skillActiveAnimationName === name) {
				this.skillActiveAnimationName = undefined;
				this.animationUpdate = true;
			}
			return;
		}

		this.skillActiveAnimationName = name;
		this.animationUpdate = true;
	}

	public updateBondPlaybackProgress(animationState: AnimationState) {
		this.bond.updatePlaybackProgress(animationState);
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

		const current = animationState.getCurrent(this.skillActiveTrackIndex);
		const { progress } = computeBarProgress(
			current?.animation
				? [{ animationName: current.animation.name, loop: true }]
				: [],
			current?.animation
				? {
						animationName: current.animation.name,
						trackTime: current.trackTime,
						duration: current.animation.duration,
					}
				: undefined
		);
		this.skillBarProgress = progress;
	}

	public handleBondAnimationComplete(
		entry: TrackEntry,
		animationState: AnimationState
	) {
		this.bondAutoPlay.handleAnimationComplete(
			entry,
			animationState,
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

		return this.getSkillAnimation(skeletonData, animationState);
	}

	private getSkillAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState
	): Animation[] {
		if (this.lastSkillSkeletonData !== skeletonData) {
			this.lastSkillSkeletonData = skeletonData;
			this.skillActiveAnimationName = undefined;
			this.skillActiveTrackIndex = 0;
		}

		const animations: Animation[] = [];
		const idleName = findIdleAnimationName(skeletonData.animations);
		if (idleName) {
			animations.push({ trackIndex: 0, animationName: idleName, loop: true });
		}

		const beforeBg = animations.length;
		this.tryAddAnimations(animations, POSSIBLE_BG_NAMES, skeletonData);
		const bgAnimations = animations.slice(beforeBg);

		if (this.touch || this.cutScene) {
			const possible = this.touch ? TOUCH_NAMES : CUTSCENE_NAMES;
			const touch = this.touch;
			const cutScene = this.cutScene;
			this.touch = false;
			this.cutScene = false;

			if (cutScene) {
				for (const { trackIndex } of bgAnimations) {
					animationState.setEmptyAnimation(trackIndex, 0);
				}
			}

			// silence the checkbox loop track so it can't outrank
			// (and stomp) the one-shot animation about to play
			animationState.setEmptyAnimation(SKILL_CHECKBOX_TRACK, 0);

			const startingTrack = animations.length;
			animations.splice(0, animations.length);
			this.tryAddAnimations(animations, possible, skeletonData, {
				loop: false,
				startingTrack,
			});
			this.skillActiveTrackIndex = startingTrack;

			const listener: AnimationStateListener = {
				complete: (entry: TrackEntry) => {
					if (!possible.includes(entry.animation?.name ?? "")) {
						return;
					}

					for (let i = 0; i < animations.length; i++) {
						animationState.setEmptyAnimation(
							i + startingTrack,
							touch ? 0 : 0.5
						);
					}
					for (const track of animationState.tracks) {
						if (
							track &&
							POSSIBLE_IDLE_NAMES.includes(track.animation?.name ?? "")
						) {
							track.trackTime = 0;
						}
					}

					if (cutScene) {
						for (const { trackIndex, animationName, loop } of bgAnimations) {
							animationState.setAnimation(trackIndex, animationName, loop);
						}
					}

					const resumeName = this.skillActiveAnimationName ?? idleName;
					if (resumeName) {
						animationState.setAnimation(SKILL_CHECKBOX_TRACK, resumeName, true);
					}

					this.skillActiveTrackIndex = 0;
					animationState.removeListener(listener);
				},
			};
			animationState.addListener(listener);
		}

		// checkbox-driven loop, on its own track so it never
		// collides with the touch/cutscene one-shot flow above.
		// Skipped while a one-shot owns the higher-priority tracks
		// (see the setEmptyAnimation/resumeName above) so it can't
		// stomp the one-shot's pose.
		if (this.skillActiveTrackIndex === 0) {
			if (this.skillActiveAnimationName) {
				animations.push({
					trackIndex: SKILL_CHECKBOX_TRACK,
					animationName: this.skillActiveAnimationName,
					loop: true,
				});
			} else if (idleName) {
				animations.push({
					trackIndex: SKILL_CHECKBOX_TRACK,
					animationName: idleName,
					loop: true,
				});
			}
		}

		return animations;
	}

	tryAddAnimations(
		animations: Animation[],
		possible: string[],
		skeletonData: SkeletonData,
		options?: {
			onlyOne?: boolean;
			startingTrack?: number;
			loop?: boolean;
		}
	) {
		for (const anim of possible) {
			if (skeletonData.animations.some((a) => a.name === anim)) {
				animations.push({
					trackIndex: animations.length + (options?.startingTrack ?? 0),
					animationName: anim,
					loop: options?.loop ?? true,
				});
				if (options?.onlyOne) break;
			}
		}
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
			this.skinLevel = 1;
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
