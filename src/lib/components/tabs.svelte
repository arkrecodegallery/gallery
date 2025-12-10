<script lang="ts">
	import { keybinds } from "$lib/keybinds";
	import type { ModelView } from "$lib/types";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "./key.svelte";

	const views: ModelView[] = [
		"loveLink1",
		"loveLink2",
		"loveLink3",
		"hero",
		"alt",
		"skill",
		"bond",
	];
	const nameMap: Record<ModelView, string> = {
		hero: "Skin",
		alt: "Alt Skin",
		skill: "Skill",
		bond: "Bond",
		loveLink1: "Love Link 1",
		loveLink2: "Love Link 2",
		loveLink3: "Love Link 3",
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
			case "loveLink1":
				return keybinds.Love_Link_1;
			case "loveLink2":
				return keybinds.Love_Link_2;
			case "loveLink3":
				return keybinds.Love_Link_3;
		}
	}
</script>

<div class="absolute bottom-0 right-0 text-foreground mb-4 flex flex-col gap-4">
	{#each views as view}
		{@const disabled = store.modelState.viewDisabled(view)}
		{@const name = nameMap[view]}
		{@const key = getKey(view)}
		{#if store.modelState.view === view}
			<div
				class="bg-background/80 border border-foreground border-r-black/0 px-4 gap-4 py-2 rounded-s-lg"
			>
				{name}
			</div>
		{:else if disabled}
			<div
				class="bg-background/10 border border-black/0 px-4 gap-4 py-2 rounded-s-lg flex justify-between text-border items-center"
			>
				<p>{name}</p>
				<Key class="text-right" disabled {key} />
			</div>
		{:else}
			<div
				class="bg-background/50 border border-black/0 px-4 gap-4 py-2 rounded-s-lg flex justify-between"
			>
				<p>{name}</p>
				{#if (view === "alt" && store.modelState.view === "hero") || view !== "alt"}
					<Key class="text-right" {key} />
				{/if}
			</div>
		{/if}
	{/each}
</div>
