import { store } from "./state.svelte";
import type { Model } from "../cache";
import type { Animation, ModelView } from "../types";
import type {
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { keybinds } from "$lib/keybinds";
import { addKeydownListener, isLoveLinkView } from "$lib/utils";

const trueHeroIndex = localStorage.getItem("trueHeroIndex");
const heroIndex = localStorage.getItem("heroIndex");

export class ModelState {
	trueHeroIndex: number = $state(
		trueHeroIndex !== null ? JSON.parse(trueHeroIndex) : 0
	);
	heroIndex: number = $state(heroIndex !== null ? JSON.parse(heroIndex) : 0);
	view: ModelView = $state("hero");

	skin: string = $state("LV1");
	skinLevel: number = 1;
	skinUpdate: boolean = false;
	skipSkinCalculation: boolean = false;

	touch: boolean = false;
	cutScene: boolean = false;
	animations: Record<string, number> = $state({});
	animationUpdate: boolean = false;

	loveLink: number = $state(1);

	modelUpdate: boolean = false;

	constructor() {
		addKeydownListener((ev) => {
			this.handleSkinChange(ev.key);
			this.handleAnimationChange(ev.key);
			this.handleModelChange(ev.key);
			this.handleLoveLinkChange(ev.key);
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

		if (this.view === "hero") {
			this.skin = `LV${this.skinLevel}`;
		} else if (this.view === "alt") {
			const attempt = `LV${this.skinLevel}`;
			if (store.skeletonData?.skins.some((a) => a.name === attempt)) {
				this.skin = attempt;
			} else {
				this.skin = store.skeletonData?.skins[0].name ?? "default";
			}
		} else if (this.view === "skill" || this.view === "bond") {
			if (store.skeletonData?.skins.some((a) => a.name === "LV1")) {
				this.skin = "LV1";
			} else {
				this.skin = store.skeletonData?.skins[0].name ?? "default";
			}
		}
	}

	public getSkin(skeletonData: SkeletonData): string {
		return this.skin;
	}

	public getAltSkin(heroData = store.heroData[this.trueHeroIndex]): string {
		const id = heroData.ID;
		const alt = `${id}b`;
		const hasAlt = !!store.skelData[id]?.includes(alt);
		return hasAlt ? alt : "";
	}

	handleAnimationChange(key: string) {
		switch (key) {
			case keybinds.Cutscene:
				if (this.view === "skill" || this.view === "bond") {
					this.cutScene = true;
					this.animationUpdate = true;
				}
				break;
			case keybinds.Touch:
				if (this.view === "hero" || this.view === "skill") {
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
		if (this.view === "bond") {
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

		if (this.view === "skill") {
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
		let prevView: ModelView = this.view;

		const first = 0;
		let prev = this.heroIndex - 1;
		for (; prev >= first; prev--) {
			const id = store.filteredHeroData[prev].ID;
			if ((store.skelData[id] ?? []).length > 0) {
				break;
			}
		}

		const last = store.filteredHeroData.length - 1;
		let next = this.heroIndex + 1;
		for (; next <= last; next++) {
			const id = store.filteredHeroData[next].ID;
			if ((store.skelData[id] ?? []).length > 0) {
				break;
			}
		}

		switch (key) {
			case keybinds.Hero_Decrement:
				this.heroIndex = prev < first ? last : prev;
				modelSwitch = true;
				break;
			case keybinds.Hero_Increment:
				this.heroIndex = next > last ? first : next;
				modelSwitch = true;
				break;
			case keybinds.Hero_View:
				if (this.view === "hero") {
					this.view = "alt";
				} else {
					this.view = "hero";
				}
				viewSwitch = true;
				break;
			case keybinds.Skill_View:
				this.view = "skill";
				viewSwitch = true;
				break;
			case keybinds.Bond_View:
				this.view = "bond";
				viewSwitch = true;
				break;
		}

		if (modelSwitch) {
			const id = store.filteredHeroData[this.heroIndex].ID;
			this.trueHeroIndex =
				store.heroData.findIndex((h) => h.ID === id) ?? -1;

			if (this.view === "skill") {
				if (!this.getSkillModel()) {
					this.view = "hero";
				}
			} else if (this.view === "alt") {
				if (!this.getAltSkin()) {
					this.view = "hero";
				}
			} else if (this.view === "bond") {
				if (!this.getBondModel()) {
					this.view = "hero";
				}
			} else if (isLoveLinkView(this.view)) {
				if (this.getLoveLinks().length < this.loveLink) {
					this.view = "hero";
				}
			}

			this.modelUpdate = true;
			this.skinLevel = 1;
		} else if (viewSwitch) {
			if (prevView === this.view) {
				// nothing to update
				return;
			}

			if (this.view === "hero") {
				this.modelUpdate = true;
			} else if (this.view === "alt") {
				if (!this.getAltSkin()) {
					this.view = "hero";
				} else {
					this.modelUpdate = true;
				}
			} else if (this.view === "skill") {
				if (!this.getSkillModel()) {
					this.view = prevView;
				} else {
					this.modelUpdate = true;
				}
			} else if (this.view === "bond") {
				if (!this.getBondModel()) {
					this.view = prevView;
				} else {
					this.modelUpdate = true;
				}
			}
		}
	}

	getSkillModel(heroData = store.heroData[this.trueHeroIndex]): string {
		const id = heroData.ID;

		if (store.skelData[id]?.includes(`${id}_S`)) {
			return `${id}_S`;
		} else if (store.skelData[id]?.includes(`${id}_b`)) {
			return `${id}_b`;
		} else {
			return "";
		}
	}

	getBondModel(heroData = store.heroData[this.trueHeroIndex]) {
		const bond = store.bondData.find((b) => b.Name === heroData.Name);
		const id = bond?.ID ?? "";
		const skels = store.skelData[id] ?? [];

		if (bond && skels.includes(id)) {
			return bond;
		}
		return undefined;
	}

	public hasModelUpdate() {
		const update = this.modelUpdate;
		this.modelUpdate = false;
		return update;
	}

	public getModel(): Model {
		const id = store.heroData[this.trueHeroIndex].ID;

		if (this.view === "hero" || isLoveLinkView(this.view)) {
			return {
				prefix: id,
				model: id,
			};
		} else if (this.view === "alt") {
			const alt = this.getAltSkin();
			return {
				prefix: id,
				model: alt,
			};
		} else if (this.view === "skill") {
			return {
				prefix: id,
				model: this.getSkillModel(),
			};
		} else if (this.view === "bond") {
			const bond = this.getBondModel();
			if (bond === undefined) {
				return {
					prefix: "",
					model: "",
				};
			}

			return {
				prefix: bond.ID,
				model: bond.ID,
			};
		} else {
			return {
				prefix: "",
				model: "",
			};
		}
	}

	private handleLoveLinkChange(key: string) {
		const loveLinks = this.getLoveLinks();

		switch (key) {
			case keybinds.Love_Link_1:
				if (loveLinks.length >= 1) {
					this.loveLink = 1;
					this.view = "loveLink1";
				}
				break;
			case keybinds.Love_Link_2:
				if (loveLinks.length >= 2) {
					this.loveLink = 2;
					this.view = "loveLink2";
				}
				break;
			case keybinds.Love_Link_3:
				if (loveLinks.length >= 3) {
					this.loveLink = 3;
					this.view = "loveLink3";
				}
				break;
		}
	}

	public getLoveLinks(
		heroData = store.heroData[this.trueHeroIndex]
	): string[] {
		const name = heroData.Name;
		const entry = store.loveLinkData.find((ll) => ll.Name === name);
		if (!entry) return [];

		const result = [];
		if (entry["Image 1"]) result.push(entry["Image 1"]);
		if (entry["Image 2"]) result.push(entry["Image 2"]);
		if (entry["Image 3"]) result.push(entry["Image 3"]);
		return result;
	}

	public viewDisabled(view: ModelView): boolean {
		switch (view) {
			case "hero":
				return false; // always available
			case "alt":
				return this.getAltSkin() === "";
			case "skill":
				return this.getSkillModel() === "";
			case "bond":
				return this.getBondModel() === undefined;
			case "loveLink1":
				return this.getLoveLinks().length < 1;
			case "loveLink2":
				return this.getLoveLinks().length < 2;
			case "loveLink3":
				return this.getLoveLinks().length < 3;
		}
	}
}
