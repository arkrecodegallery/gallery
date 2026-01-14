<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import Spinner from "./ui/spinner/spinner.svelte";

	const image = $derived.by(() => {
		const entry = store.modelState.getRelativeEntry();
		if (entry.collection) {
			return store.assetManager.path(
				entry.collection[store.modelState.cycleIndex]
			);
		} else {
			return undefined;
		}
	});
</script>

<div
	class="w-dvw h-dvh bg-canvas/50 backdrop-blur-sm absolute z-7 flex justify-center items-center {!store.loading
		? 'hidden'
		: ''}"
>
	<Spinner class="size-12" />
</div>

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
