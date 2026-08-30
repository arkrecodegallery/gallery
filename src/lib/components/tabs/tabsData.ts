import { keybinds } from "$lib/core/keybinds.svelte";
import type { Entry, ModelView } from "$lib/core/types";

export const TAB_VIEWS: ModelView[] = ["hero", "skill", "bond", "collection"];

export const VIEW_NAMES: Record<ModelView, string> = {
	hero: "Hero",
	alt: "Err",
	skill: "Skill",
	bond: "Bond",
	collection: "Collection",
};

export function getViewKey(view: ModelView): string {
	switch (view) {
		case "hero":
		case "alt":
			return keybinds.Hero_View;
		case "skill":
			return keybinds.Skill_View;
		case "bond":
			return keybinds.Bond_View;
		case "collection":
			return keybinds.Collection_View;
	}
}

export function getViewCount(view: ModelView, entry: Entry): number {
	switch (view) {
		case "hero":
			return entry.alt ? 2 : 1;
		case "skill":
			return entry.skill ? 1 : 0;
		case "bond":
			return entry.bond ? entry.bond.length : 0;
		case "collection":
			return entry.collection ? entry.collection.length : 0;
		default:
			return 0;
	}
}

export function getViewIndex(
	view: ModelView,
	currentView: ModelView,
	cycleIndex: number
): number {
	switch (view) {
		case "hero":
			return currentView === "hero" ? 0 : 1;
		case "skill":
			return 0;
		case "bond":
			return cycleIndex;
		case "collection":
			return cycleIndex;
		default:
			return 0;
	}
}
