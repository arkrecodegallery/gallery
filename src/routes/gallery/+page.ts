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

	// Warms the byte cache before the canvas mounts - see prepareAssets() on
	// AssetManager for why this can't happen inside loadModel() itself.
	const initialEntry = store.modelState.heroSelection.getAbsoluteEntry();
	await store.assetManager
		.prepareAssets(initialEntry, store.view, store.modelState.heroSelection.cycleIndex)
		.catch(() => {});
};
