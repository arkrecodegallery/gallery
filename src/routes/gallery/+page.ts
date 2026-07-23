import { AssetManager } from "$lib/core/cache.js";
import { platform } from "$platform";
import { store } from "$lib/hooks/state.svelte";

export const load = async () => {
	store.assetManager = new AssetManager(await platform.getContainerBaseUrl());
	store.map = await platform.loadMap();
};
