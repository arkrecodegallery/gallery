<script lang="ts">
	import { keybinds } from "$lib/keybinds";
	import type { ModelView } from "$lib/types";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "./key.svelte";

	const views: ModelView[] = ["hero", "alt", "skill", "bond", "collection"];
	const nameMap: Record<ModelView, string> = {
		hero: "Skin",
		alt: "Alt Skin",
		skill: "Skill",
		bond: "Bond",
		collection: "Collections",
	};

	function getKey(view: ModelView): string {
		// TODO only skin or alk skin should be highlighted
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
				return keybinds.Love_Link_1;
		}
	}
</script>

<div class="absolute bottom-0 right-0 text-foreground mb-4 flex flex-col gap-4">
	{#each views as view}
		{@const disabled = store.modelState.viewDisabled(view)}
		{@const name = nameMap[view]}
		{@const key = getKey(view)}
		{#if store.view === view}
			<div
				class="bg-canvas/80 border border-foreground/50 border-r-black/0 px-4 gap-4 py-2 rounded-s-lg items-center"
			>
				{name}
			</div>
		{:else if disabled}
			<div
				class="bg-canvas/70 border border-black/0 px-4 gap-4 py-2 rounded-s-lg flex justify-between text-border items-center"
			>
				<p>{name}</p>
				<Key class="text-right" disabled {key} />
			</div>
		{:else}
			<div
				class="bg-canvas/80 border border-foreground/10 px-4 gap-4 py-2 rounded-s-lg flex justify-between items-center"
			>
				<p>{name}</p>
				{#if (view === "alt" && store.view === "hero") || view !== "alt"}
					<Key class="text-right" {key} />
				{/if}
			</div>
		{/if}
	{/each}
</div>
