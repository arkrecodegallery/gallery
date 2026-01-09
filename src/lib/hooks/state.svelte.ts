import { AssetManager } from "$lib/core/cache";
import { ModelState } from "./modelState.svelte";
import type { Entry, Map, ModelView } from "$lib/core/types";
import type { SkeletonData } from "@esotericsoftware/spine-core";
import type {
	ColumnFiltersState,
	SortingState,
	Table,
} from "@tanstack/table-core";

const menuStates = localStorage.getItem("menuStates");

export class Store {
	// data
	map: Map = $state({});

	// model
	view: ModelView = $state("hero");
	assetManager: AssetManager = $state() as AssetManager;
	skeletonData: SkeletonData | undefined = $state();
	modelState: ModelState = $state(new ModelState());

	// renderer
	_canvasElement: HTMLCanvasElement | undefined = $state();
	get canvasElement(): HTMLCanvasElement {
		if (!this._canvasElement) throw new Error("Canvas Element Undefined");
		return this._canvasElement;
	}

	// table
	table: Table<Entry> | undefined = $state(undefined);
	sorting = $state<SortingState>([]);
	columnFilters = $state<ColumnFiltersState>([]);
	menuStates: Record<
		string,
		{
			value: string;
			nonEmpty: boolean;
			asc: boolean;
			desc: boolean;
		}
	> = $state(menuStates !== null ? JSON.parse(menuStates) : {});

	get filteredHeroData(): Entry[] {
		return (
			this.table?.getRowModel().rows.map((row) => row.original) ??
			Object.values(this.map)
		);
	}
}

export const store = new Store();
