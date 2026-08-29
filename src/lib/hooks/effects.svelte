<!-- Set up a bunch of side effects for the app -->

<script lang="ts">
	import { store } from "./state.svelte";

	// update the heroIndex when filteredHeroData changes
	$effect(() => {
		if (store.filteredHeroData.length > 0) {
			const entry = store.modelState.heroSelection.getAbsoluteEntry();
			store.modelState.heroSelection.relativeHeroIndex =
				store.filteredHeroData.findIndex((h) => h.id === entry.id);
		}
	});

	// save the heroIndex and trueHeroIndex to localStorage
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

	// save the table filters to localStorage
	$effect(() => {
		localStorage.setItem(
			"menuStates",
			JSON.stringify($state.snapshot(store.menuStates))
		);
	});
</script>
