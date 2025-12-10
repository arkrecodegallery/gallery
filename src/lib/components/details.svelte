<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import Icon from "@iconify/svelte";
	import Key from "./key.svelte";
	import { keybinds } from "$lib/keybinds";

	const details = $derived(store.heroData[store.modelState.trueHeroIndex]);
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
		if (!details.Birthday) return "";

		const split = details.Birthday.split(" / ");
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
</script>

<div
	class="flex flex-col p-4 bg-canvas/80 rounded-br-xl text-foreground absolute top-0 gap-1"
>
	<p>{details.ID}: {details.Name}</p>
	{#if details.Stars}
		<div class="flex gap-1">
			{#each Array.from({ length: parseInt(details.Stars) }) as _}
				<Icon icon="mdi:star" />
			{/each}
		</div>
	{/if}
	<div class="flex items-center gap-1">
		{#if birthday}
			<p>{birthday}</p>
		{/if}
		{#if details.Constellation}
			<Icon
				icon={`mdi:zodiac-${(details.Constellation ?? "").toLocaleLowerCase()}`}
				height="16"
				width="16"
			/>
		{/if}
		{#if details.Class}
			<img
				src={`/icons/class/${details.Class}.png`}
				alt={details.Class}
				height="16"
				width="16"
				style="filter: brightness(0) saturate(100%) invert(99%) sepia(5%) saturate(0%) hue-rotate(47deg) brightness(103%) contrast(100%);"
			/>
		{/if}
		{#if details.Attribute}
			<img
				src={`/icons/types/${details.Attribute}.png`}
				alt={details.Attribute}
				height="16"
				width="16"
			/>
		{/if}
	</div>
	<div>
		{#if details.Bust}
			{details.Bust}
			{#if details.Height || details.Weight}
				,
			{/if}
		{/if}
		{#if details.Height}
			{details.Height}
			{#if details.Weight}
				,
			{/if}
		{/if}
		{#if details.Weight}
			{details.Weight}
		{/if}
	</div>
	<div class="flex gap-2">
		<div><Key key={keybinds.Hero_Decrement} /> -</div>
		<div><Key key={keybinds.Hero_Increment} /> +</div>
	</div>
</div>
