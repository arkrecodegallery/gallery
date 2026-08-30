<script lang="ts">
	import type { ModelView } from "$lib/core/types";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "../key.svelte";
	import {
		TAB_VIEWS,
		VIEW_NAMES,
		getViewKey,
		getViewCount,
		getViewIndex,
	} from "./tabsData";

	function getKey(view: ModelView): string {
		return getViewKey(view);
	}

	function getCount(view: ModelView): number {
		return getViewCount(view, store.modelState.heroSelection.getAbsoluteEntry());
	}

	function getIndex(view: ModelView): number {
		return getViewIndex(view, store.view, store.modelState.heroSelection.cycleIndex);
	}

	function switchView(view: ModelView) {
		store.modelState.navigation.handleModelChange(getViewKey(view));
	}
</script>

<div
	class="text-foreground flex flex-col gap-4 z-10 {store.uiState !== 'visible'
		? 'hidden'
		: ''}"
>
	{#each TAB_VIEWS as view}
		{@const disabled = store.modelState.heroSelection.viewDisabled(view)}
		{@const name = VIEW_NAMES[view]}
		{@const key = getKey(view)}
		{@const count = getCount(view)}
		{@const index = getIndex(view)}

		{#if store.view === view || (store.view === "alt" && view === "hero")}
			<button
				class="bg-canvas/80 border border-foreground/50 border-r-black/0 px-4 py-2 rounded-s-lg flex flex-col cursor-pointer"
				onclick={() => switchView(view)}
			>
				<div class="w-full flex justify-between items-center gap-4">
					<p>{name}</p>
					<Key class="text-right" {key} />
				</div>
				{@render carousel(count, index, true)}
			</button>
		{:else if disabled}
			<div
				class="bg-canvas/80 border border-black/0 px-4 py-2 rounded-s-lg text-disabled-foreground flex flex-col"
			>
				<div class="w-full flex justify-between items-center gap-4">
					<p>{name}</p>
					<Key class="text-right" {key} disabled />
				</div>
				{@render carousel(count, index, false)}
			</div>
		{:else}
			<button
				class="bg-canvas/80 border border-foreground/10 px-4 py-2 rounded-s-lg flex flex-col cursor-pointer"
				onclick={() => switchView(view)}
			>
				<div class="w-full flex justify-between items-center gap-4">
					<p>{name}</p>
					<Key class="text-right" {key} />
				</div>
				{@render carousel(count, index, false)}
			</button>
		{/if}
	{/each}
</div>

<div
	class="text-foreground mr-4 flex flex-col gap-1 w-20 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	{#each TAB_VIEWS as view}
		{@const disabled = store.modelState.heroSelection.viewDisabled(view)}
		{@const count = getCount(view)}
		{@const index = getIndex(view)}

		{#if store.view === view || (store.view === "alt" && view === "hero")}
			{@render carousel(count, index, true)}
		{:else if disabled}
			{@render carousel(count, index, false)}
		{:else}
			{@render carousel(count, index, false)}
		{/if}
	{/each}
</div>

{#snippet carousel(count: number, index: number, active: boolean)}
	<div class="flex gap-1 pt-1">
		{#if count === 0}
			<div class="h-1 w-full bg-disabled rounded-full"></div>
		{:else if count === 1}
			<div
				class="h-1 w-full {active
					? 'bg-foreground'
					: 'bg-muted-foreground/50'} rounded-full"
			></div>
		{:else}
			{#each Array.from({ length: count }) as _, c}
				<div
					class="h-1 w-full {active
						? index === c
							? 'bg-foreground'
							: 'bg-muted-foreground/50'
						: 'bg-muted-foreground/50'} rounded-full {c}"
				></div>
			{/each}
		{/if}
	</div>
{/snippet}
