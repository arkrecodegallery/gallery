import { findIdleAnimationName } from "$lib/core/idleAnimation";
import { getEligibleAnimationNames } from "$lib/core/heroAnimations";
import { computeBarProgress } from "$lib/core/bondProgress";
import { DEFAULT_MIX_DURATION } from "$lib/core/animationMix";
import type { Animation } from "$lib/core/types";
import type {
	AnimationState,
	AnimationStateListener,
	SkeletonData,
	TrackEntry,
} from "@esotericsoftware/spine-core";

export class HeroViewState {
	eligibleNames: string[] = $state([]);
	selectedIndex: number = $state(0);
	playingIndex: number = $state(-1);
	barProgress: number = $state(0);

	private idleName?: string;
	private activeClipName?: string;
	private activeClipLoop = false;
	private checkboxOverride = false;
	private activeTrackIndex = 0;
	private lastSkeletonData?: SkeletonData;
	private lastSkelName?: string;

	private syncEligibility(skeletonData: SkeletonData, skelName: string) {
		if (this.lastSkeletonData === skeletonData && this.lastSkelName === skelName) {
			return;
		}

		this.lastSkeletonData = skeletonData;
		this.lastSkelName = skelName;
		this.idleName = findIdleAnimationName(skeletonData.animations);
		this.eligibleNames = getEligibleAnimationNames(skeletonData.animations, skelName);
		this.selectedIndex = 0;
		this.playingIndex = -1;
		this.activeClipName = undefined;
		this.activeClipLoop = false;
		this.checkboxOverride = false;
	}

	cycleSelection(skeletonData: SkeletonData, skelName: string): boolean {
		this.syncEligibility(skeletonData, skelName);
		if (this.eligibleNames.length === 0) {
			return false;
		}

		const hadOverride = this.checkboxOverride;
		if (hadOverride) {
			this.activeClipName = undefined;
			this.activeClipLoop = false;
			this.playingIndex = -1;
			this.checkboxOverride = false;
		}

		this.selectedIndex = (this.selectedIndex + 1) % this.eligibleNames.length;
		return hadOverride;
	}

	playSelected(skeletonData: SkeletonData, skelName: string): boolean {
		this.syncEligibility(skeletonData, skelName);
		const name = this.eligibleNames[this.selectedIndex];
		if (!name) {
			return false;
		}
		if (this.activeClipName && !this.checkboxOverride) {
			return false;
		}

		this.checkboxOverride = false;
		this.activeClipName = name;
		this.activeClipLoop = false;
		this.playingIndex = this.selectedIndex;
		return true;
	}

	// checkbox-driven: any animation, always loops, switches freely
	setChecked(skeletonData: SkeletonData, name: string, checked: boolean, skelName: string) {
		this.syncEligibility(skeletonData, skelName);

		if (!checked) {
			if (this.activeClipName === name) {
				this.activeClipName = undefined;
				this.activeClipLoop = false;
				this.checkboxOverride = false;
				this.playingIndex = -1;
			}
			return;
		}

		this.activeClipName = name;
		this.activeClipLoop = true;
		this.checkboxOverride = true;
		const index = this.eligibleNames.indexOf(name);
		this.playingIndex = index;
		if (index !== -1) {
			this.selectedIndex = index;
		}
	}

	currentClipName(): string | undefined {
		return this.activeClipName ?? this.idleName;
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState,
		skelName: string
	): Animation[] {
		this.syncEligibility(skeletonData, skelName);

		const animations: Animation[] = [];
		if (this.idleName) {
			animations.push({
				trackIndex: 0,
				animationName: this.idleName,
				loop: true,
			});
		}

		this.activeTrackIndex = animations.length;
		if (this.activeClipName) {
			const clipName = this.activeClipName;
			animations.push({
				trackIndex: this.activeTrackIndex,
				animationName: clipName,
				loop: this.activeClipLoop,
			});
			if (!this.activeClipLoop) {
				this.registerCompletion(animationState, clipName);
			}
		} else if (this.idleName) {
			// keeps the 2nd track explicit so a stopped clip doesn't linger
			animations.push({
				trackIndex: this.activeTrackIndex,
				animationName: this.idleName,
				loop: true,
			});
		}

		return animations;
	}

	private registerCompletion(animationState: AnimationState, clipName: string) {
		const listener: AnimationStateListener = {
			complete: (entry: TrackEntry) => {
				if (entry.animation?.name !== clipName) {
					return;
				}

				animationState.setEmptyAnimation(this.activeTrackIndex, DEFAULT_MIX_DURATION);
				const idleTrack = animationState.getCurrent(0);
				if (idleTrack) {
					idleTrack.trackTime = 0;
				}

				this.activeClipName = undefined;
				this.activeClipLoop = false;
				this.playingIndex = -1;
				animationState.removeListener(listener);
			},
		};
		animationState.addListener(listener);
	}

	updatePlaybackProgress(animationState: AnimationState) {
		const trackIndex = this.activeClipName ? this.activeTrackIndex : 0;
		const clipName = this.activeClipName ?? this.idleName;
		const current = animationState.getCurrent(trackIndex);
		const bars = clipName
			? [{ animationName: clipName, loop: !this.activeClipName }]
			: [];
		const { progress } = computeBarProgress(
			bars,
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
}
