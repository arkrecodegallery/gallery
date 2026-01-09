<script lang="ts">
	import { onMount } from "svelte";
	import { SpineCanvas } from "@esotericsoftware/spine-webgl";
	import { App } from "$lib/core/app";
	import { store } from "$lib/hooks/state.svelte";
	import Details from "$lib/components/details.svelte";
	import Tabs from "$lib/components/tabs.svelte";
	import Controls from "$lib/components/controls.svelte";
	import Table from "$lib/components/listing.svelte";
	import LoveLink from "$lib/components/loveLink.svelte";
	import Effects from "$lib/hooks/effects.svelte";

	onMount(() => {
		if (!store.canvasElement) throw new Error("Canvas element not bound");

		new SpineCanvas(store.canvasElement, {
			app: new App(),
		});
	});
</script>

<Effects />
<Details />
<Controls />
<Tabs />
<Table />
<LoveLink />
<canvas bind:this={store._canvasElement}></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
