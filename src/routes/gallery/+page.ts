import { AssetManager } from "$lib/core/cache.js";
import { ASSET_PROTOCOL, FILE_MAP, PATH_GALLERY_DATA } from "$lib/core/constants.js";
import type { Map } from "$lib/core/types";
import { store } from "$lib/hooks/state.svelte";

export const load = async ({ fetch }) => {
	const basePath = await PATH_GALLERY_DATA();
	store.assetManager = new AssetManager(basePath);

	const mapPath = await PATH_GALLERY_DATA(FILE_MAP);
	const mapResp = await fetch(`${ASSET_PROTOCOL}/${mapPath}`);
	const map: Map = await mapResp.json();
	store.map = map;
};
