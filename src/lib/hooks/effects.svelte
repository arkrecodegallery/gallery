<script lang="ts">
	import { store } from "./state.svelte";

	$effect(() => {
		if (store.filteredHeroData.length > 0) {
			const entry = store.modelState.heroSelection.getAbsoluteEntry();
			store.modelState.heroSelection.relativeHeroIndex =
				store.filteredHeroData.findIndex((h) => h.id === entry.id);
		}
	});

	$effect(() => {
		localStorage.setItem(
			"absoluteHeroIndex",
			JSON.stringify($state.snapshot(store.modelState.heroSelection.absoluteHeroIndex))
		);
		localStorage.setItem(
			"relativeHeroIndex",
			JSON.stringify($state.snapshot(store.modelState.heroSelection.relativeHeroIndex))
		);
	});

	$effect(() => {
		localStorage.setItem(
			"menuStates",
			JSON.stringify($state.snapshot(store.menuStates))
		);
	});
</script>
