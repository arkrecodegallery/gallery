import { store } from "./state.svelte";
import type { HeroSelection } from "./heroSelection.svelte";
import type { SkinState } from "./skinState.svelte";
import type { BondViewState } from "./bondViewState.svelte";
import type { Entry, ModelView } from "$lib/core/types";
import { keybinds } from "$lib/core/keybinds.svelte";

export class ModelNavigation {
	constructor(
		private heroSelection: HeroSelection,
		private skinState: SkinState,
		private bondViewState: BondViewState,
		private onModelUpdate: () => void
	) {}

	handleModelChange(key: string, modelSwitch = false, viewSwitch = false) {
		const prevView: ModelView = store.view;
		const keybindResult = this.applyKeybind(key);
		modelSwitch ||= keybindResult.modelSwitch;
		viewSwitch ||= keybindResult.viewSwitch;

		const entry = store.filteredHeroData[this.heroSelection.relativeHeroIndex];
		if (modelSwitch) {
			this.handleModelSwitch(entry);
		} else if (viewSwitch) {
			if (store.view === "bond") {
				this.handleBondViewSwitch(entry, prevView);
			} else if (store.view === "collection") {
				this.handleCollectionViewSwitch(entry, prevView);
			} else if (prevView !== store.view) {
				this.handleGenericViewSwitch(entry, prevView);
			}
		}
	}

	selectHeroById(id: string) {
		this.heroSelection.absoluteHeroIndex =
			Object.values(store.map).findIndex((h) => h.id === id) ?? 0;
		this.heroSelection.relativeHeroIndex =
			store.filteredHeroData.findIndex((h) => h.id === id) ?? 0;
		this.handleModelChange("", true);
	}

	private findAdjacentIndex(direction: 1 | -1): number {
		const last = store.filteredHeroData.length - 1;
		let index = this.heroSelection.relativeHeroIndex + direction;

		while (index >= 0 && index <= last) {
			const id = store.filteredHeroData[index].id;
			if (!!store.map[id]) return index;
			index += direction;
		}

		return direction > 0 ? 0 : last;
	}

	private applyKeybind(key: string): { modelSwitch: boolean; viewSwitch: boolean } {
		switch (key) {
			case keybinds.Hero_Decrement:
				this.heroSelection.relativeHeroIndex = this.findAdjacentIndex(-1);
				return { modelSwitch: true, viewSwitch: false };
			case keybinds.Hero_Increment:
				this.heroSelection.relativeHeroIndex = this.findAdjacentIndex(1);
				return { modelSwitch: true, viewSwitch: false };
			case keybinds.Hero_View:
				store.view = store.view === "hero" ? "alt" : "hero";
				return { modelSwitch: false, viewSwitch: true };
			case keybinds.Skill_View:
				store.view = "skill";
				return { modelSwitch: false, viewSwitch: true };
			case keybinds.Bond_View:
				store.view = "bond";
				return { modelSwitch: false, viewSwitch: true };
			case keybinds.Collection_View:
				store.view = "collection";
				return { modelSwitch: false, viewSwitch: true };
			default:
				return { modelSwitch: false, viewSwitch: false };
		}
	}

	private handleModelSwitch(entry: Entry) {
		this.heroSelection.absoluteHeroIndex = Object.values(store.map).findIndex(
			(h) => h.id === entry.id
		);
		this.heroSelection.cycleIndex = 0;
		this.bondViewState.stillsIndex = 0;

		if (store.view === "collection") {
			if ((entry.collection ?? []).length === 0) {
				store.view = "hero";
			}
		} else {
			const bundle = this.heroSelection.getBundle(entry, store.view);
			if (!bundle) {
				store.view = "hero";
			}
			store.loading = true;
		}

		this.onModelUpdate();
		this.skinState.skinLevel = 1;
	}

	private handleBondViewSwitch(entry: Entry, prevView: ModelView) {
		if ((entry.bond ?? []).length === 0) {
			store.view = prevView;
			return;
		}

		if (prevView === "bond") {
			const prevIndex = this.heroSelection.cycleIndex;
			this.heroSelection.cycleIndex += 1;
			if (this.heroSelection.cycleIndex === entry.bond!.length) {
				this.heroSelection.cycleIndex = 0;
			}
			if (prevIndex === this.heroSelection.cycleIndex) {
				return;
			}
		} else {
			this.heroSelection.cycleIndex = 0;
		}

		this.bondViewState.stillsIndex = 0;

		if (!!this.heroSelection.getBundle(entry, store.view)) {
			this.onModelUpdate();
		}

		store.loading = true;
	}

	private handleCollectionViewSwitch(entry: Entry, prevView: ModelView) {
		if ((entry.collection ?? []).length === 0) {
			store.view = prevView;
		} else if (prevView === "collection") {
			this.heroSelection.cycleIndex += 1;
			if (this.heroSelection.cycleIndex === entry.collection!.length) {
				this.heroSelection.cycleIndex = 0;
			}
		} else {
			this.heroSelection.cycleIndex = 0;
		}

		store.loading = true;
	}

	private handleGenericViewSwitch(entry: Entry, prevView: ModelView) {
		const bundle = this.heroSelection.getBundle(entry, store.view);
		if (!bundle) {
			store.view = prevView;
		} else {
			this.onModelUpdate();
			this.heroSelection.cycleIndex = 0;
		}
	}
}
