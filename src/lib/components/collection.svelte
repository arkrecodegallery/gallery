<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { fade } from "svelte/transition";
	import Spinner from "./ui/spinner/spinner.svelte";

	const image = $derived.by(() => {
		const entry = store.modelState.getAbsoluteEntry();
		if (entry.collection) {
			return store.assetManager.path(
				entry.collection[store.modelState.cycleIndex]
			);
		} else {
			return undefined;
		}
	});
</script>

{#if store.loading}
	<div
		class="w-dvw h-dvh bg-canvas/30 backdrop-blur-sm absolute z-7 flex justify-center items-center"
		transition:fade
	>
		<Spinner class="size-12" />
	</div>
{/if}

{#if store.view === "collection" && image}
	<div class="w-dvw h-dvh bg-canvas absolute z-5">
		<img
			src={image}
			onload={() => {
				if (store.view === "collection") {
					store.loading = false;
				}
			}}
			alt="temp"
			class="object-contain w-full h-full z-10 p-8"
		/>
	</div>
{/if}
