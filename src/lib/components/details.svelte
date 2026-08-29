<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import * as Kbd from "$lib/components/ui/kbd/index.js";
	import Key from "./key.svelte";
	import { keybinds } from "$lib/core/keybinds.svelte";
	import { imperialHeight, imperialWeight, prettyBirthday } from "$lib/core/format";
	import { zodiacIcons, starDisplay } from "./detailsFormat";

	let entry = $derived.by(() => {
		() => store.modelState.heroSelection.absoluteHeroIndex;
		return Object.values(store.map)[store.modelState.heroSelection.absoluteHeroIndex];
	});

	const stars = $derived(starDisplay(entry));

	const ZodiacIcon = $derived(
		zodiacIcons[(entry.details.constellation ?? "").toLocaleLowerCase()]
	);
	const birthday = $derived(prettyBirthday(entry));
	const height = $derived(imperialHeight(entry));
	const weight = $derived(imperialWeight(entry));
	const hasDetails = $derived(
		entry.details.birthday ||
			entry.details.constellation ||
			entry.details.job ||
			entry.details.element ||
			entry.details.cup_size ||
			entry.details.weight ||
			entry.details.height
	);
</script>

<div class="{store.uiState !== "visible" ? "hidden" : ""} z-10">
	<div
		class="border border-l-black/0 border-foreground/50 bg-canvas/80 p-2 px-4 rounded-r-lg {hasDetails
			? 'mb-4'
			: ''} relative w-fit"
	>
		<div class="flex gap-2">
			<p class="font-bold">{entry.id}</p>
			<Kbd.KbdGroup>
				<Key key={keybinds.Hero_Decrement} />
				<Key key={keybinds.Hero_Increment} />
			</Kbd.KbdGroup>
		</div>
		<p>{entry.details.name}</p>
		{#if stars}
			<img
				src={stars.src}
				alt="stars"
				class="absolute top-0 left-0 -mt-2.5 ml-2 {stars.width}"
			/>
		{/if}
	</div>

	{#if hasDetails}
		<div
			class="border border-l-black/0 border-foreground/10 bg-canvas/80 p-2 px-4 rounded-r-lg flex flex-col gap-1 w-fit"
		>
			<div class="flex items-center gap-1">
				{#if birthday}
					<p>{birthday}</p>
				{/if}
				{#if ZodiacIcon}
					<ZodiacIcon size={16} />
				{/if}
				{#if entry.details.job}
					<img
						src={`/icons/class/${entry.details.job}.png`}
						alt={entry.details.job}
						class="size-4"
						style="filter: brightness(0) saturate(100%) invert(99%) sepia(5%) saturate(0%) hue-rotate(47deg) brightness(103%) contrast(100%) opacity(100%);"
					/>
				{/if}
				{#if entry.details.element}
					<img
						src={`/icons/types/${entry.details.element}.png`}
						alt={entry.details.element}
						class="size-4"
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
		</div>
	{/if}
</div>

<div
	class="text-muted-foreground absolute p-4 top-0 gap-1 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	<p class="whitespace-nowrap">{entry.id}: {entry.details.name}</p>
</div>
