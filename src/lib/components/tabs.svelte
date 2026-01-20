<script lang="ts">
	import { keybinds } from "$lib/core/keybinds";
	import type { ModelView } from "$lib/core/types";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "./key.svelte";

	const views: ModelView[] = ["hero", "skill", "bond", "collection"];
	const nameMap: Record<ModelView, string> = {
		hero: "Hero",
		alt: "Err",
		skill: "Skill",
		bond: "Bond",
		collection: "Collection",
	};

	function getKey(view: ModelView): string {
		switch (view) {
			case "hero":
				return keybinds.Hero_View;
			case "alt":
				return keybinds.Hero_View;
			case "skill":
				return keybinds.Skill_View;
			case "bond":
				return keybinds.Bond_View;
			case "collection":
				return keybinds.Collection_View;
		}
	}

	function getCount(view: ModelView): number {
		const entry = store.modelState.getAbsoluteEntry();

		switch (view) {
			case "hero":
				return entry.alt ? 2 : 1;
			case "skill":
				return entry.skill ? 1 : 0;
			case "bond":
				return entry.bond ? entry.bond.length : 0;
			case "collection":
				return entry.collection ? entry.collection.length : 0;
			default:
				return 0;
		}
	}

	function getIndex(view: ModelView): number {
		switch (view) {
			case "hero":
				return store.view === "hero" ? 0 : 1;
			case "skill":
				return 0;
			case "bond":
				return store.modelState.cycleIndex;
			case "collection":
				return store.modelState.cycleIndex;
			default:
				return 0;
		}
	}

	function switchView(view: ModelView) {
		const key = getKey(view);
		const event = new KeyboardEvent("keydown", {
			key,
			code: key,
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(event);
	}
</script>

<div
	class="text-foreground flex flex-col gap-4 z-10 {store.uiState !== 'visible'
		? 'hidden'
		: ''}"
>
	{#each views as view}
		{@const disabled = store.modelState.viewDisabled(view)}
		{@const name = nameMap[view]}
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
	{#each views as view}
		{@const disabled = store.modelState.viewDisabled(view)}
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
