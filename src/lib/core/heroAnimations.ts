import type { Animation } from "@esotericsoftware/spine-core";
import { getAnimationPrefix } from "./animationName";
import { findIdleAnimationName } from "./idleAnimation";
import { getHeroRule } from "./heroRules";

export function getEligibleAnimationNames(
	animations: Animation[],
	skelName: string
): string[] {
	const idleName = findIdleAnimationName(animations);
	const skip = new Set(getHeroRule(skelName).skip ?? []);
	return animations
		.filter((a) => a.name !== idleName && getAnimationPrefix(a.name) < 90 && !skip.has(a.name))
		.map((a) => a.name);
}
