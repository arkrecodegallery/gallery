import type { Animation } from "@esotericsoftware/spine-core";

export const POSSIBLE_IDLE_NAMES = [
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

export function findIdleAnimationName(animations: Animation[]): string | undefined {
	const names = new Set(animations.map((a) => a.name));
	return POSSIBLE_IDLE_NAMES.find((candidate) => names.has(candidate));
}
