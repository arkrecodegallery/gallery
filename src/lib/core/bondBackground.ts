import type { AnimationState } from "@esotericsoftware/spine-core";
import type { BondRule } from "./bondRules";

// safe at a low index: suppressed exactly when checkbox multi-select
// would otherwise reach this track
export const BOND_BACKGROUND_TRACK = 1;

/** Clears every track not in `keepTrackIndices` - callers decide whether the background track is kept. */
export function clearStaleBondTracks(
	animationState: AnimationState,
	keepTrackIndices: Iterable<number>
) {
	const keep = new Set(keepTrackIndices);
	for (let i = 0; i < animationState.tracks.length; i++) {
		if (!keep.has(i)) {
			animationState.clearTrack(i);
		}
	}
}

export function resolveBackgroundAnimation(
	rule: BondRule,
	defaultBackgroundName: string | undefined,
	currentMainAnimationName: string | undefined,
	activeBackgroundName: string | undefined,
	suppressed: boolean,
	isFirstStage: boolean
): string | undefined {
	if (suppressed) {
		return undefined;
	}

	if (!rule.background) {
		return defaultBackgroundName;
	}

	// stage 0 is always the intro/idle before any progress trigger fires,
	// so cycling back around to it (advance() wraps past the last stage)
	// must reset the background instead of staying latched on the last trigger
	if (!activeBackgroundName || isFirstStage) {
		return rule.background.base;
	}

	for (const [name, trigger] of Object.entries(rule.background.progress ?? {})) {
		if (trigger === currentMainAnimationName) {
			return name;
		}
	}

	return activeBackgroundName;
}

/** Guards against a hand-authored rule (or a skeleton with no `90_bg`) naming a clip that doesn't exist. */
export function isKnownBackgroundClip(
	name: string | undefined,
	skeletonData: { animations: { name: string }[] } | undefined
): name is string {
	return !!name && !!skeletonData?.animations.some((a) => a.name === name);
}
