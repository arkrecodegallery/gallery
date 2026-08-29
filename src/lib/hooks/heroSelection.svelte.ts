import { store } from "./state.svelte";
import type { Entry, ModelView } from "$lib/core/types";
import { skelName } from "$lib/core/skelName";

function fromLocalStorage(item: string): number {
	const value = localStorage.getItem(item);
	return !!value ? JSON.parse(value) : 0;
}

export class HeroSelection {
	absoluteHeroIndex: number = $state(fromLocalStorage("absoluteHeroIndex"));
	relativeHeroIndex: number = $state(fromLocalStorage("relativeHeroIndex"));
	cycleIndex: number = $state(0);

	entry(index: number): Entry {
		return Object.values(store.map)[index];
	}

	getAbsoluteEntry(): Entry {
		return this.entry(this.absoluteHeroIndex);
	}

	getBundle(entry: Entry, view: ModelView) {
		switch (view) {
			case "hero":
				return entry.hero;
			case "alt":
				return entry.alt;
			case "skill":
				return entry.skill;
			case "bond":
				return entry.bond?.[this.cycleIndex];
			default:
				throw new Error("Unreachable code");
		}
	}

	/** The skel name backing the currently displayed view; only defined for hero/alt/bond. */
	resolveSkelName(): string | undefined {
		const entry = this.getAbsoluteEntry();
		switch (store.view) {
			case "hero":
				return skelName(entry.hero.skel);
			case "alt":
				return entry.alt && skelName(entry.alt.skel);
			case "bond": {
				const presentation = entry.bond?.[this.cycleIndex];
				return presentation?.kind === "animated"
					? skelName(presentation.bundle.skel)
					: undefined;
			}
			default:
				return undefined;
		}
	}

	viewDisabled(view: ModelView): boolean {
		const entry = this.getAbsoluteEntry();

		switch (view) {
			case "hero":
				return false; // always available
			case "alt":
				return entry.alt === undefined;
			case "skill":
				return entry.skill === undefined;
			case "bond":
				return entry.bond === undefined;
			case "collection":
				return entry.collection === undefined;
		}
	}
}
