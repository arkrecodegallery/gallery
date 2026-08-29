import { store } from "$lib/hooks/state.svelte";

export interface FilterMenuState {
	value: string;
	nonEmpty: boolean;
	asc: boolean;
	desc: boolean;
}

export function persistFilterMenuState(
	columnId: string,
	patch: Partial<FilterMenuState>
) {
	Object.assign(store.menuStates[columnId], patch);
}
