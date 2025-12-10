<!-- Set up a bunch of side effects for the app -->

<script lang="ts">
	import { store } from "./state.svelte";

	// update the heroIndex when filteredHeroData changes
	$effect(() => {
		if (store.filteredHeroData.length > 0) {
			const ID = store.heroData[store.modelState.trueHeroIndex].ID;
			store.modelState.heroIndex = store.filteredHeroData.findIndex(
				(h) => h.ID === ID
			);
		}
	});

	// save the heroIndex and trueHeroIndex to localStorage
	$effect(() => {
		localStorage.setItem(
			"trueHeroIndex",
			JSON.stringify($state.snapshot(store.modelState.trueHeroIndex))
		);
		localStorage.setItem(
			"heroIndex",
			JSON.stringify($state.snapshot(store.modelState.heroIndex))
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
