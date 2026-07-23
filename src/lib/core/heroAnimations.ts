import type { Animation } from "@esotericsoftware/spine-core";
import { getAnimationPrefix } from "./animationName";
import { findIdleAnimationName } from "./idleAnimation";

export function getEligibleAnimationNames(animations: Animation[]): string[] {
	const idleName = findIdleAnimationName(animations);
	return animations
		.filter((a) => a.name !== idleName && getAnimationPrefix(a.name) < 90)
		.map((a) => a.name);
}
