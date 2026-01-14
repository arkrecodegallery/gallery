<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import Icon from "@iconify/svelte";
	import Key from "./key.svelte";
	import { keybinds } from "$lib/core/keybinds";

	let entry = $derived.by(() => {
		() => store.modelState.absoluteHeroIndex;
		return Object.values(store.map)[store.modelState.absoluteHeroIndex];
	});
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const birthday = $derived.by(() => {
		if (!entry.details.birthday) return "";

		const split = entry.details.birthday.split(" / ");
		if (split.length != 2) return "";

		let monthIndex = 0;
		try {
			monthIndex = parseInt(split[0]);
			if (monthIndex >= months.length) return "";

			const day = parseInt(split[1]);
			if (day > 31) return "";
		} catch {
			return "";
		}

		return `${months[monthIndex - 1]} ${split[1]}`;
	});
	const height = $derived.by(() => {
		if (!entry.details.height) return "";

		try {
			let height = entry.details.height;
			if (!height.endsWith(" cm")) throw "";
			height = height.substring(0, height.length - 3);

			const cm = Number(height);
			if (Number.isNaN(cm)) throw "";

			const total = Math.round(cm / 2.54);
			const feet = Math.floor(total / 12);
			const inch = Math.floor(total % 12);
			return `${feet.toFixed(0)}' ${inch.toFixed(0)}\"`;
		} catch {
			return entry.details.height;
		}
	});
	const weight = $derived.by(() => {
		if (!entry.details.weight) return "";

		try {
			let weight = entry.details.weight;
			if (!weight.endsWith(" kg")) throw "";
			weight = weight.substring(0, weight.length - 3);

			const kg = Number(weight);
			if (Number.isNaN(kg)) throw "";

			const total = Math.round(kg * 2.205);
			return `${total.toFixed(0)} lb`;
		} catch {
			return entry.details.weight;
		}
	});
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
