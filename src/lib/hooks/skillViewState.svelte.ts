import type { Animation } from "../core/types";
import type {
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";
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

export class SkillViewState {
	touch = false;
	cutScene = false;
	skillActiveTrackIndex = 0;
	skillActiveAnimationName?: string;
	barProgress: number = $state(0);
	bgAnimationNames: string[] = $state([]);

	private lastSkeletonData?: SkeletonData;

	requestTouch() {
		this.skillActiveAnimationName = undefined;
		this.touch = true;
	}

	requestCutscene() {
		this.skillActiveAnimationName = undefined;
		this.cutScene = true;
	}

	setChecked(name: string, checked: boolean) {
		if (!checked) {
			if (this.skillActiveAnimationName === name) {
				this.skillActiveAnimationName = undefined;
			}
			return;
		}

		this.skillActiveAnimationName = name;
	}

	currentCheckboxAnimation(
		animationState: AnimationState,
		skeletonData: SkeletonData
	): string | undefined {
		// reflect the q/e one-shot clip while it's actually playing
		const oneShot =
			this.skillActiveTrackIndex !== 0
				? animationState.getCurrent(this.skillActiveTrackIndex)?.animation?.name
				: undefined;

		return (
			oneShot ??
			this.skillActiveAnimationName ??
			findIdleAnimationName(skeletonData.animations)
		);
	}

	updatePlaybackProgress(animationState: AnimationState) {
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
		this.barProgress = progress;
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState
	): Animation[] {
		if (this.lastSkeletonData !== skeletonData) {
			this.lastSkeletonData = skeletonData;
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
		this.bgAnimationNames = bgAnimations.map((a) => a.animationName);

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

	private tryAddAnimations(
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
}
