<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { isLoveLinkView } from "$lib/utils";

	const loveLinkImage = $derived.by(() => {
		const images = store.modelState.getLoveLinks();
		const image = images[store.modelState.loveLink - 1];
		const prefix = image.split(".")[0];
		return `/spines/${prefix}/${image}`;
	});
</script>

{#if isLoveLinkView(store.modelState.view)}
	<div class="w-dvw h-dvh p-8">
		<img
			src={loveLinkImage}
			alt="temp"
			class="object-contain w-full h-full z-10"
		/>
	</div>
{/if}
