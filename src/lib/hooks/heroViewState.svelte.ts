import { findIdleAnimationName } from "$lib/core/idleAnimation";
import { getEligibleAnimationNames } from "$lib/core/heroAnimations";
import { computeBarProgress } from "$lib/core/bondProgress";
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
	private activeTrackIndex = 0;
	private lastSkeletonData?: SkeletonData;

	private syncEligibility(skeletonData: SkeletonData) {
		if (this.lastSkeletonData === skeletonData) {
			return;
		}

		this.lastSkeletonData = skeletonData;
		this.idleName = findIdleAnimationName(skeletonData.animations);
		this.eligibleNames = getEligibleAnimationNames(skeletonData.animations);
		this.selectedIndex = 0;
		this.playingIndex = -1;
		this.activeClipName = undefined;
	}

	cycleSelection(skeletonData: SkeletonData) {
		this.syncEligibility(skeletonData);
		if (this.eligibleNames.length === 0) {
			return;
		}

		this.selectedIndex = (this.selectedIndex + 1) % this.eligibleNames.length;
	}

	playSelected(skeletonData: SkeletonData): boolean {
		this.syncEligibility(skeletonData);
		const name = this.eligibleNames[this.selectedIndex];
		if (!name || this.activeClipName) {
			return false;
		}

		this.activeClipName = name;
		this.playingIndex = this.selectedIndex;
		return true;
	}

	getAnimation(
		skeletonData: SkeletonData,
		animationState: AnimationState
	): Animation[] {
		this.syncEligibility(skeletonData);

		const animations: Animation[] = [];
		if (this.idleName) {
			animations.push({
				trackIndex: 0,
				animationName: this.idleName,
				loop: true,
			});
		}

		if (this.activeClipName) {
			const clipName = this.activeClipName;
			this.activeTrackIndex = animations.length;
			animations.push({
				trackIndex: this.activeTrackIndex,
				animationName: clipName,
				loop: false,
			});
			this.registerCompletion(animationState, clipName);
		}

		return animations;
	}

	private registerCompletion(animationState: AnimationState, clipName: string) {
		const listener: AnimationStateListener = {
			complete: (entry: TrackEntry) => {
				if (entry.animation?.name !== clipName) {
					return;
				}

				animationState.setEmptyAnimation(this.activeTrackIndex, 0);
				const idleTrack = animationState.getCurrent(0);
				if (idleTrack) {
					idleTrack.trackTime = 0;
				}

				this.activeClipName = undefined;
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
