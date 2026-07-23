import { store } from "./state.svelte";
import type { Animation, Bundle, Entry, ModelView } from "../core/types";
import type {
	AnimationState,
	AnimationStateListener,
	Skeleton,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
import { keybinds } from "$lib/core/keybinds";
import { addKeydownListener } from "$lib/utils";
import { Animate } from "$lib/core/animate";
import { getBondRule } from "$lib/core/bondRules";
import { BondSequencer, type BondSequenceStep } from "$lib/core/bondSequencer";
import { computeBarProgress } from "$lib/core/bondProgress";

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
	bondAnimationIndex: number = $state(0);
	modelUpdate: boolean = false;

	bondStageIndex: number = $state(0);
	bondStageCount: number = $state(0);
	bondSequenceBars: BondSequenceStep[] = $state([]);
	bondManualOverride: boolean = $state(false);
	bondActiveBarIndex: number = $state(-1);
	bondBarProgress: number = $state(0);
	bondAutoPlay: boolean = $state(false);

	private bondSequencer = new BondSequencer();
	private lastBondSkeletonData?: SkeletonData;

	constructor() {
		addKeydownListener((ev) => {
			this.handleSkinChange(ev.key);
			this.handleAnimationChange(ev.key);
			this.handleModelChange(ev.key);
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
				if (store.view === "skill") {
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
				if (store.view === "hero" || store.view === "skill") {
					this.touch = true;
					this.animationUpdate = true;
				} else if (store.view === "bond") {
					const entry = this.getAbsoluteEntry();
					const presentation = entry.bond![this.cycleIndex];
					if (presentation.kind === "stills") {
						this.bondAnimationIndex += 1;
						if (this.bondAnimationIndex === presentation.images.length) {
							this.bondAnimationIndex = 0;
						}
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

	public bondAnimationStageMap(): Map<string, number> | undefined {
		if (store.view !== "bond" || !store.skeletonData) {
			return undefined;
		}

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable) {
			return undefined;
		}

		return new Animate(store.skeletonData.animations, rule).stageByName;
	}

	public setAnimationChecked(name: string, checked: boolean, additive = false) {
		if (store.view === "bond") {
			// manual selection takes over from the auto-sequencer until the
			// next stage advance hands control back
			this.bondSequencer.manualOverride = true;
			this.bondAutoPlay = false;

			if (checked) {
				this.anchorBondSequencer(name);
			}
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
		if (!store.skeletonData) {
			return;
		}

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable) {
			return;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		if (!this.bondSequencer.advance(animate)) {
			return;
		}
		this.syncBondSequenceMeta(animate);

		this.animationUpdate = true;
		this.skinUpdate = true;
	}

	public startBondAutoPlay() {
		if (!store.skeletonData) {
			return;
		}

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable) {
			return;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		this.bondSequencer.enterStage(animate, 0);
		this.bondAutoPlay = true;
		this.syncBondSequenceMeta(animate);

		this.animationUpdate = true;
		this.skinUpdate = true;
	}

	private tryAdvanceAutoPlay(entry: TrackEntry): boolean {
		if (
			store.view !== "bond" ||
			!this.bondAutoPlay ||
			this.bondManualOverride ||
			entry.next !== null ||
			!store.skeletonData
		) {
			return false;
		}

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable) {
			this.bondAutoPlay = false;
			return false;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		if (this.bondSequencer.stageIndex >= animate.groups.length - 1) {
			this.bondAutoPlay = false;
			return false;
		}

		this.advanceBondStage();
		return true;
	}

	private anchorBondSequencer(name: string) {
		if (!store.skeletonData) {
			return;
		}

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable) {
			return;
		}

		const animate = new Animate(store.skeletonData.animations, rule);
		this.bondSequencer.takeManualControl(animate, name);
		this.syncBondSequenceMeta(animate);
	}

	private syncBondSequenceMeta(animate: Animate) {
		this.bondStageIndex = this.bondSequencer.stageIndex;
		this.bondStageCount = animate.groups.length;
		this.bondSequenceBars = this.bondSequencer.sequence;
		this.bondManualOverride = this.bondSequencer.manualOverride;
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

		const rule = getBondRule(this.getAbsoluteEntry().id);
		if (rule.disable || this.bondSequencer.manualOverride) {
			return;
		}

		const current = animationState.getCurrent(0)?.animation?.name;
		if (!current) {
			return;
		}

		const keys = Object.keys(this.animations);
		if (keys.length !== 1 || keys[0] !== current) {
			this.animations = { [current]: 0 };
		}
	}

	public updateBondPlaybackProgress(animationState: AnimationState) {
		if (store.view !== "bond" || this.bondManualOverride) {
			return;
		}

		const current = animationState.getCurrent(0);
		const { activeBarIndex, progress } = computeBarProgress(
			this.bondSequenceBars,
			current?.animation
				? {
						animationName: current.animation.name,
						trackTime: current.trackTime,
						duration: current.animation.duration,
					}
				: undefined
		);
		this.bondActiveBarIndex = activeBarIndex;
		this.bondBarProgress = progress;
	}

	public handleBondAnimationComplete(
		entry: TrackEntry,
		animationState: AnimationState
	) {
		if (this.tryAdvanceAutoPlay(entry)) {
			return;
		}
		this.handleBondLoopComplete(entry, animationState);
	}

	private handleBondLoopComplete(
		entry: TrackEntry,
		animationState: AnimationState
	) {
		if (store.view !== "bond" || this.bondManualOverride) {
			return;
		}

		const chain = this.bondSequencer.loopChain;
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

	public getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skeleton: Skeleton
	): Animation[] {
		if (store.view === "bond") {
			const rule = getBondRule(this.getAbsoluteEntry().id);
			const isNewSkeleton = this.lastBondSkeletonData !== skeletonData;
			if (isNewSkeleton) {
				this.lastBondSkeletonData = skeletonData;
				this.bondSequencer.reset();
				this.bondAutoPlay = false;
			}

			if (rule.disable) {
				return this.manualBondAnimations();
			}

			animationState.clearTracks();
			skeleton.setToSetupPose();

			if (isNewSkeleton) {
				const animate = new Animate(skeletonData.animations, rule);
				this.bondSequencer.enterStage(animate, 0);
				this.syncBondSequenceMeta(animate);
			}

			if (this.bondSequencer.manualOverride) {
				return this.manualBondAnimations();
			}

			return this.bondSequencer.sequence.map((step) => ({
				trackIndex: 0,
				animationName: step.animationName,
				loop: step.loop,
			}));
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

		let bgAnimations: Animation[] = [];
		if (store.view === "skill") {
			const possible = [
				"90_BG",
				"90_BG2",
				"90_BG3",
				"90_BG_Loop",
				"90_Sparkle",
				"90_BG_02",
			];
			const beforeBg = animations.length;
			this.tryAddAnimations(animations, possible, skeletonData);
			bgAnimations = animations.slice(beforeBg);
		}

		if (this.touch || this.cutScene) {
			const possible = this.touch
				? ["04_Touch", "01_Touch"]
				: ["02_CutIn", "02_Cutin", "02_Cutln", "03_CutIn", "03_Cutin"];
			const touch = this.touch;
			const cutScene = this.cutScene;
			this.touch = false;
			this.cutScene = false;

			if (cutScene) {
				for (const { trackIndex } of bgAnimations) {
					animationState.setEmptyAnimation(trackIndex, 0);
				}
			}

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

					if (cutScene) {
						for (const { trackIndex, animationName, loop } of bgAnimations) {
							animationState.setAnimation(trackIndex, animationName, loop);
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
			if (store.view === "bond") {
				if (prevView === "bond") {
					const prevIndex = this.cycleIndex;
					this.cycleIndex += 1;
					if (this.cycleIndex === entry.bond!.length) {
						this.cycleIndex = 0;
					}
					if (prevIndex === this.cycleIndex) {
						return;
					}

					console.log(this.cycleIndex);
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
