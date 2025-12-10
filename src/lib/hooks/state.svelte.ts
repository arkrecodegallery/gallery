import { AssetManager } from "$lib/cache";
import { ModelState } from "./modelState.svelte";
import type { BondData, Data, HeroData, LoveLinkData } from "$lib/types";
import type { SkeletonData } from "@esotericsoftware/spine-core";
import type {
	ColumnFiltersState,
	SortingState,
	Table,
} from "@tanstack/table-core";

const menuStates = localStorage.getItem("menuStates");

export class Store {
	// table
	table: Table<Data> | undefined = $state(undefined);
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

	get filteredHeroData(): HeroData[] {
		return (
			this.table?.getRowModel().rows.map((row) => row.original) ??
			this.heroData
		);
	}

	// data
	heroData: HeroData[] = $state([]);
	bondData: BondData[] = $state([]);
	skelData: Record<string, string[]> = $state({});
	loveLinkData: LoveLinkData[] = $state([]);

	// model
	skeletonData: SkeletonData | undefined = $state();
	modelState: ModelState = $state(new ModelState());
	assetManager: AssetManager = $state(new AssetManager());

	// renderer
	_canvasElement: HTMLCanvasElement | undefined = $state();
	get canvasElement(): HTMLCanvasElement {
		if (!this._canvasElement) throw new Error("Canvas Element Undefined");
		return this._canvasElement;
	}
}

export const store = new Store();
