import type { Animation } from "@esotericsoftware/spine-core";

export const TOUCH_NAMES = ["04_Touch", "01_Touch"];
export const CUTSCENE_NAMES = ["02_CutIn", "02_Cutin", "02_Cutln", "03_CutIn", "03_Cutin"];

export function getEligibleSkillAnimationNames(animations: Animation[]): string[] {
	const eligible = new Set([...TOUCH_NAMES, ...CUTSCENE_NAMES]);
	return animations.filter((a) => eligible.has(a.name)).map((a) => a.name);
}
