<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { fade } from "svelte/transition";
	import Spinner from "./ui/spinner/spinner.svelte";
	import CachedImage from "./cachedImage.svelte";

	const image = $derived.by(() => {
		const entry = store.modelState.heroSelection.getAbsoluteEntry();

		if (store.view === "bond") {
			const presentation = entry.bond?.[store.modelState.heroSelection.cycleIndex];
			if (presentation !== undefined && presentation.kind === "stills") {
				return store.assetManager.path(
					presentation.images[store.modelState.bond.stillsIndex]
				);
			}
		} else if (store.view === "collection") {
			if (entry.collection) {
				return store.assetManager.path(
					entry.collection[store.modelState.heroSelection.cycleIndex]
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
		<CachedImage
			path={image}
			onload={() => {
				store.loading = false;
			}}
			alt="decorative"
			class="object-contain w-full h-full z-10 p-8"
		/>
	</div>
{/if}
