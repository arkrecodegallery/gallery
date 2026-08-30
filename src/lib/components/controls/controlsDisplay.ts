import type { Animation } from "@esotericsoftware/spine-core";
import { cn } from "$lib/utils";

export type DisplayStages = (number | undefined)[];

/**
 * stageMap has no entry for skipped animations (e.g. touch/emo), which
 * splits one visual group in two; bridge gaps enclosed by the same
 * stage on both sides so the group reads as continuous around them.
 */
export function computeDisplayStages(
	stageMap: Map<string, number> | undefined,
	animations: Animation[]
): DisplayStages | undefined {
	if (!stageMap) return undefined;
	const stages = animations.map((a) => stageMap.get(a.name));
	const filled = [...stages];

	let i = 0;
	while (i < filled.length) {
		if (filled[i] !== undefined) {
			i++;
			continue;
		}
		let j = i;
		while (j < filled.length && filled[j] === undefined) j++;

		const before = i > 0 ? filled[i - 1] : undefined;
		const after = j < filled.length ? stages[j] : undefined;
		if (before !== undefined && before === after) {
			filled.fill(before, i, j);
		}
		i = j;
	}

	return filled;
}

export function stageBarClass(
	displayStages: DisplayStages | undefined,
	index: number
): string | undefined {
	const stage = displayStages?.[index];
	if (stage === undefined) return undefined;

	const isFirst = stage !== displayStages?.[index - 1];
	const isLast = stage !== displayStages?.[index + 1];

	return cn(
		"pointer-events-none absolute left-1 w-5.5 bg-foreground/20",
		isFirst ? "top-1 rounded-t-full" : "top-0 rounded-t-none",
		isLast ? "bottom-1 rounded-b-full" : "bottom-0 rounded-b-none"
	);
}

export function isBridgedGap(
	displayStages: DisplayStages | undefined,
	stageMap: Map<string, number> | undefined,
	animations: Animation[],
	index: number
): boolean {
	return (
		displayStages?.[index] !== undefined &&
		stageMap?.get(animations[index].name) === undefined
	);
}
