<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { dotState } from "$lib/core/bondProgress";
	import { computeMeterData } from "./progressMeterData";

	let { className }: { className?: string } = $props();

	const data = $derived(computeMeterData(store.view, store.modelState));
</script>

{#if data.kind === "plain"}
	{@const disabled = store.view === "collection"}
	<div
		class="h-1 w-full {disabled
			? 'bg-disabled'
			: 'bg-foreground'} rounded-full mt-2 {className}"
	></div>
{:else}
	<div class="flex flex-col gap-2 w-full mt-2 {className}">
		<div class="flex gap-1">
			{#each data.bars as bar, j (j)}
				{@const barState = dotState(j, data.activeBarIndex)}
				<div
					class="flex-1 h-1 rounded-full bg-muted-foreground/50 overflow-hidden"
				>
					<div
						class="h-full bg-foreground rounded-full"
						style="width: {barState === 'complete'
							? 100
							: barState === 'current'
								? data.barProgress * 100
								: 0}%"
					></div>
				</div>
			{/each}
		</div>
		<div class="flex gap-1">
			{#if data.dotCount > 0}
				{#each Array.from({ length: data.dotCount }) as _, i}
					{@const active =
						data.selectedDot !== undefined
							? i === data.selectedDot
							: dotState(i, data.currentDot) !== "upcoming"}
					<div
						class="flex-1 h-1 rounded-full {active
							? 'bg-foreground'
							: 'bg-muted-foreground/50'}"
					></div>
				{/each}
			{:else}
				<div class="flex-1 h-1 rounded-full bg-disabled"></div>
			{/if}
		</div>
	</div>
{/if}
