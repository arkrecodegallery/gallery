import { store } from "./state.svelte";
import type { Animation, Entry, ModelView } from "../core/types";
import type {
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { keybinds } from "$lib/core/keybinds";
import { addKeydownListener } from "$lib/utils";

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

	constructor() {
		addKeydownListener((ev) => {
			this.handleSkinChange(ev.key);
			this.handleAnimationChange(ev.key);
			this.handleModelChange(ev.key);
			// this.handleLoveLinkChange(ev.key);
		});
	}

	handleSkinChange(key: string) {
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
		switch (key) {
			case keybinds.Cutscene:
				if (store.view === "skill" || store.view === "bond") {
					this.cutScene = true;
					this.animationUpdate = true;
				}
				break;
			case keybinds.Touch:
				if (store.view === "hero" || store.view === "skill") {
					this.touch = true;
					this.animationUpdate = true;
				}
				break;
		}
	}

	public hasAnimationUpdate(): boolean {
		const update = this.animationUpdate;
		this.animationUpdate = false;
		return update;
	}

	public getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState
	): Animation[] {
		if (store.view === "bond") {
			animationState.clearTracks();
			const animations: Animation[] = [];

			for (const [anim, track] of Object.entries(this.animations)) {
				animations.push({
					animationName: anim,
					trackIndex: track,
					loop: true,
				});
			}

			return animations;
		}

		const animations: Animation[] = [];
		const possibleIdle = [
			"00_Idle",
			"00_idle",
			"00_Idle_ani",
			"00_idle_ani",
			"00_Idle_ani0",
			"00_idle_ani0",
			"00_Idle_ani1",
			"00_idle_ani1",
			"01_Idle_ani",
			"01_Idle_ani1",
			"01_00_Idle_ani0",
		];
		this.tryAddAnimations(animations, possibleIdle, skeletonData, {
			onlyOne: true,
		});

		if (store.view === "skill") {
			const possible = [
				"90_BG",
				"90_BG2",
				"90_BG3",
				"90_BG_Loop",
				"90_Sparkle",
				"90_BG_02",
			];
			this.tryAddAnimations(animations, possible, skeletonData);
		}

		if (this.touch || this.cutScene) {
			const possible = this.touch
				? ["04_Touch", "01_Touch"]
				: ["02_CutIn", "02_Cutin", "02_Cutln", "03_CutIn", "03_Cutin"];
			const touch = this.touch;
			this.touch = false;
			this.cutScene = false;

			const startingTrack = animations.length;
			animations.splice(0, animations.length);
			this.tryAddAnimations(animations, possible, skeletonData, {
				loop: false,
				startingTrack,
			});

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
							possibleIdle.includes(track.animation?.name ?? "")
						) {
							track.trackTime = 0;
						}
					}

					animationState.removeListener(listener);
				},
			};
			animationState.addListener(listener);
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
					trackIndex:
						animations.length + (options?.startingTrack ?? 0),
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
			if (store.view === "collection") {
				if ((entry.collection ?? []).length === 0) {
					store.view = prevView;
				} else if (prevView === "collection") {
					this.cycleIndex += 1;
					if (this.cycleIndex === entry.collection!.length) {
						this.cycleIndex = 0;
					}
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

	public getRelativeEntry(): Entry {
		return this.entry(this.relativeHeroIndex);
	}

	// private handleLoveLinkChange(key: string) {
	// 	const loveLinks = this.getLoveLinks();

	// 	switch (key) {
	// 		case keybinds.Love_Link_1:
	// 			if (loveLinks.length >= 1) {
	// 				this.loveLink = 1;
	// 				store.view = "loveLink1";
	// 			}
	// 			break;
	// 		case keybinds.Love_Link_2:
	// 			if (loveLinks.length >= 2) {
	// 				this.loveLink = 2;
	// 				store.view = "loveLink2";
	// 			}
	// 			break;
	// 		case keybinds.Love_Link_3:
	// 			if (loveLinks.length >= 3) {
	// 				this.loveLink = 3;
	// 				store.view = "loveLink3";
	// 			}
	// 			break;
	// 	}
	// }

	// public getLoveLinks(
	// 	heroData = store.heroData[this.trueHeroIndex]
	// ): string[] {
	// 	const name = heroData.Name;
	// 	const entry = store.loveLinkData.find((ll) => ll.Name === name);
	// 	if (!entry) return [];

	// 	const result = [];
	// 	if (entry["Image 1"]) result.push(entry["Image 1"]);
	// 	if (entry["Image 2"]) result.push(entry["Image 2"]);
	// 	if (entry["Image 3"]) result.push(entry["Image 3"]);
	// 	return result;
	// }

	public viewDisabled(view: ModelView): boolean {
		const entry = this.entry(this.relativeHeroIndex);

		switch (view) {
			case "hero":
				return false; // always available
			case "alt":
				return !entry.alt;
			case "skill":
				return !entry.skill;
			case "bond":
				return !entry.bond;
			case "collection":
				return !entry.collection;
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
				return entry.bond;
			default:
				throw new Error("Unreachable code");
		}
	}
}
