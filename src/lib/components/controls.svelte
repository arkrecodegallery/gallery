<script lang="ts">
	import { keybinds } from "$lib/keybinds";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "$lib/components/key.svelte";
	import Select from "$lib/components/select.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { Button } from "./ui/button";
	import ChevronDown from "@lucide/svelte/icons/chevron-down";

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
	});
</script>

<div
	class="absolute top-0 right-0 text-foreground p-4 flex flex-col gap-4 text-right items-end"
>
	<div class="flex gap-2 items-center bg-canvas/80 py-2 px-4 rounded-xl">
		<Key
			key={keybinds.Cutscene}
			disabled={store.modelState.view !== "skill"}
		/>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Button variant="outline" class="!bg-canvas border-foreground/10">
					Animations
					<ChevronDown class="size-4 opacity-50" />
				</Button>
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
		<Key key={keybinds.Touch} disabled={store.modelState.view === "bond"} />
	</div>
	<div class="flex gap-2 items-center bg-canvas/80 py-2 px-4 rounded-xl">
		<Key key={keybinds.Skin_Decrement} />
		<Select
			name="Skin"
			class="border-none pl-1"
			values={skins.map((skin) => skin.name)}
			bind:selected={store.modelState.skin}
			onchange={() => {
				store.modelState.skipSkinCalculation = true;
				store.modelState.skinUpdate = true;
			}}
		/>
		<Key key={keybinds.Skin_Increment} />
	</div>
</div>
