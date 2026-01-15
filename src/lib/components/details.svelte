<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import Icon from "@iconify/svelte";
	import Key from "./key.svelte";
	import { keybinds } from "$lib/core/keybinds";
	import { imperialHeight, imperialWeight, prettyBirthday } from "$lib/utils";

	let entry = $derived.by(() => {
		() => store.modelState.absoluteHeroIndex;
		return Object.values(store.map)[store.modelState.absoluteHeroIndex];
	});

	const birthday = $derived(prettyBirthday(entry));
	const height = $derived(imperialHeight(entry));
	const weight = $derived(imperialWeight(entry));
</script>

<div
	class="flex flex-col p-4 bg-canvas/80 rounded-br-xl text-foreground absolute top-0 gap-1 z-10 {store.uiState !==
	'visible'
		? 'hidden'
		: ''}"
>
	<p>{entry.id}: {entry.details.name}</p>
	{#if entry.details.stars}
		<div class="flex gap-1">
			{#each Array.from({ length: parseInt(entry.details.stars) }) as _}
				<Icon icon="mdi:star" />
			{/each}
		</div>
	{/if}
	<div class="flex items-center gap-1">
		{#if birthday}
			<p>{birthday}</p>
		{/if}
		{#if entry.details.constellation}
			<Icon
				icon={`mdi:zodiac-${(entry.details.constellation ?? "").toLocaleLowerCase()}`}
				height="16"
				width="16"
			/>
		{/if}
		{#if entry.details.job}
			<img
				src={`/icons/class/${entry.details.job}.png`}
				alt={entry.details.job}
				height="16"
				width="16"
				style="filter: brightness(0) saturate(100%) invert(99%) sepia(5%) saturate(0%) hue-rotate(47deg) brightness(103%) contrast(100%);"
			/>
		{/if}
		{#if entry.details.element}
			<img
				src={`/icons/types/${entry.details.element}.png`}
				alt={entry.details.element}
				height="16"
				width="16"
			/>
		{/if}
	</div>
	<div>
		{#if entry.details.cup_size}
			{entry.details.cup_size}
			{#if entry.details.height || entry.details.weight}
				,
			{/if}
		{/if}
		{#if entry.details.height}
			{height}
			{#if entry.details.weight}
				,
			{/if}
		{/if}
		{#if entry.details.weight}
			{weight}
		{/if}
	</div>
	<div class="flex gap-2">
		<div><Key key={keybinds.Hero_Decrement} /> -</div>
		<div><Key key={keybinds.Hero_Increment} /> +</div>
	</div>
</div>

<div
	class="text-muted-foreground absolute p-4 top-0 gap-1 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	<p>{entry.id}: {entry.details.name}</p>
</div>
