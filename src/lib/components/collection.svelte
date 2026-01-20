<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { fade } from "svelte/transition";
	import Spinner from "./ui/spinner/spinner.svelte";

	const image = $derived.by(() => {
		const entry = store.modelState.getAbsoluteEntry();

		if (store.view === "bond") {
			const tuple = entry.bond?.[store.modelState.cycleIndex];
			if (tuple !== undefined && tuple[0] === null) {
				return store.assetManager.path(
					tuple[1][store.modelState.bondAnimationIndex]
				);
			}
		} else if (store.view === "collection") {
			if (entry.collection) {
				return store.assetManager.path(
					entry.collection[store.modelState.cycleIndex]
				);
			} else {
				return undefined;
			}
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

{#if image}
	<div class="w-dvw h-dvh bg-canvas absolute z-5">
		<img
			src={image}
			onload={() => {
				store.loading = false;
			}}
			alt="decorative"
			class="object-contain w-full h-full z-10 p-8"
		/>
	</div>
{/if}
