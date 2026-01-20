<script lang="ts">
	import { keybinds } from "$lib/core/keybinds";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "$lib/components/key.svelte";
	import * as Kbd from "$lib/components/ui/kbd/index.js";
	import Select from "$lib/components/select.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { Button } from "./ui/button";
	import { ClapperboardIcon, ShirtIcon } from "@lucide/svelte";

	const skins = $derived(store.skeletonData?.skins ?? []);
	const animations = $derived(store.skeletonData?.animations ?? []);

	let selectedAnimations: Record<string, boolean | undefined> = $state({});
	$effect(() => {
		selectedAnimations = Object.fromEntries(
			animations.map((a) => [a.name, false])
		);
	});
	$effect(() => {
		let i = 0;
		const result: Record<string, number> = {};
		for (const [anim, active] of Object.entries(selectedAnimations)) {
			if (active === true) {
				result[anim] = i++;
			}
		}
		store.modelState.animations = result;
		store.modelState.animationUpdate = true;
		store.modelState.skinUpdate = true;

		// make it shift-friendly (use select type="multiple" when shift is held?)
		// tie-in with timeline
	});
</script>

<div
	class="flex flex-col gap-4 mt-4 z-10 {store.uiState !== 'visible'
		? 'hidden'
		: ''}"
>
	<div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="w-full cursor-pointer rounded-l-lg">
				{@render tab()}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				{#each animations as anim}
					<DropdownMenu.CheckboxItem
						bind:checked={selectedAnimations[anim.name]}
						closeOnSelect={false}
					>
						{anim.name}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<button
		class="w-full border border-r-black/0 border-foreground/10 bg-canvas/80 py-2 px-4 rounded-l-lg cursor-pointer"
	>
		<!-- <Select
			name="Skin"
			class="border-none pl-1"
			values={skins.map((skin) => skin.name)}
			bind:selected={store.modelState.skin}
			onchange={() => {
				store.modelState.skipSkinCalculation = true;
				store.modelState.skinUpdate = true;
			}}
		> -->
		<div class="flex gap-4 justify-between items-center">
			<ShirtIcon class="size-4" />
			<Kbd.Group>
				<Key
					key={keybinds.Skin_Decrement}
					disabled={store.view !== "hero" && store.view !== "alt"}
				/>
				<Key
					key={keybinds.Skin_Increment}
					disabled={store.view !== "hero" && store.view !== "alt"}
				/>
			</Kbd.Group>
		</div>
		<!-- </Select> -->
	</button>
</div>

{#snippet tab()}
	<div
		class="w-full border border-r-black/0 border-foreground/50 bg-canvas/80 py-2 px-4 rounded-l-lg"
	>
		<div class="flex gap-4 justify-between items-center">
			<ClapperboardIcon class="size-4" />
			<Kbd.Group>
				<Key
					key={keybinds.Cutscene}
					disabled={store.view !== "skill"}
				/>
				<Key key={keybinds.Touch} disabled={store.view === "bond"} />
			</Kbd.Group>
		</div>
		{@render progress()}
	</div>
{/snippet}

<div
	class="text-foreground mr-4 flex flex-col gap-1 w-20 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	{@render progress()}
</div>

{#snippet progress()}
	<div class="h-1 w-full bg-foreground rounded-full mt-2"></div>
{/snippet}
