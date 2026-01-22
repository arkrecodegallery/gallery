<script lang="ts">
	import { onMount } from "svelte";
	import { SpineCanvas } from "@esotericsoftware/spine-webgl";
	import { App } from "$lib/core/app";
	import { store } from "$lib/hooks/state.svelte";
	import Details from "$lib/components/details.svelte";
	import Tabs from "$lib/components/tabs.svelte";
	import Controls from "$lib/components/controls.svelte";
	import Table from "$lib/components/listing.svelte";
	import Collection from "$lib/components/collection.svelte";
	import Effects from "$lib/hooks/effects.svelte";

	onMount(() => {
		if (!store.canvasElement) throw new Error("Canvas element not bound");

		new SpineCanvas(store.canvasElement, {
			app: new App(),
		});
	});
</script>

<Effects />
<div class="z-10">
	<div class="absolute top-0 left-0 flex flex-col gap-4 pt-4">
		<Details />
		<Table />
	</div>
	<div class="absolute bottom-0 right-0 flex flex-col items-stretch pb-4">
		<Controls>
			<Tabs />
		</Controls>
	</div>
</div>
<Collection />
<canvas bind:this={store._canvasElement}></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
		display: block;
		z-index: 0;
	}
</style>
