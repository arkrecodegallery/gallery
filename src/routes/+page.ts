import type { Map } from "$lib/types";
import { store } from "$lib/hooks/state.svelte";

export const load = async ({ fetch }) => {
	const mapResp = await fetch("/gallery-data/map.json");
	const map: Map = await mapResp.json();
	store.map = map;
};
