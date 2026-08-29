import { AssetManager } from "$lib/core/cache.js";
import { platform } from "$platform";
import { store } from "$lib/hooks/state.svelte";

export const load = async () => {
	store.assetManager = new AssetManager(await platform.getContainerBaseUrl());
	store.map = await platform.loadMap();

	const heroCount = Object.keys(store.map).length;
	const index = store.modelState.heroSelection.absoluteHeroIndex;
	if (index < 0 || index >= heroCount) {
		store.modelState.heroSelection.absoluteHeroIndex = 0;
	}
};
