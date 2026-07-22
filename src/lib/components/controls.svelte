<script lang="ts">
	import { keybinds } from "$lib/core/keybinds";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "$lib/components/key.svelte";
	import * as Kbd from "$lib/components/ui/kbd/index.js";
	import Select from "$lib/components/select.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { Button } from "./ui/button";
	import { ClapperboardIcon, ShirtIcon } from "@lucide/svelte";
	import BondProgressMeter from "$lib/components/bond-progress-meter.svelte";

	const skins = $derived(store.skeletonData?.skins ?? []);
	const animations = $derived(store.skeletonData?.animations ?? []);

	let { children } = $props();

	let shiftHeld = $state(false);
	$effect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Shift") shiftHeld = true;
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") shiftHeld = false;
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
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
				{@render skinTab()}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.RadioGroup
					bind:value={store.modelState.skin}
					onValueChange={() => {
						store.modelState.skipSkinCalculation = true;
						store.modelState.skinUpdate = true;
					}}
				>
					{#each skins as skin}
						<DropdownMenu.RadioItem value={skin.name}>
							{skin.name}
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	{@render children()}
	<div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="w-full cursor-pointer rounded-l-lg">
				{@render animationTab()}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				{#each animations as anim}
					<DropdownMenu.CheckboxItem
						checked={anim.name in store.modelState.animations}
						onCheckedChange={(checked) =>
							store.modelState.setAnimationChecked(
								anim.name,
								checked,
								shiftHeld,
							)}
						closeOnSelect={false}
					>
						{anim.name}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>

{#snippet skinTab()}
	{@const disabled = store.view !== "hero" && store.view !== "alt"}
	<div
		class="w-full border border-r-black/0 {disabled
			? 'border-foreground/10'
			: 'border-foreground/50'} bg-canvas/80 py-2 px-4 rounded-l-lg"
	>
		<div class="flex gap-4 justify-between items-center">
			<ShirtIcon
				class="{disabled ? 'text-disabled-foreground' : ''} size-4"
			/>
			<Kbd.Group>
				<Key key={keybinds.Skin_Decrement} {disabled} />
				<Key key={keybinds.Skin_Increment} {disabled} />
			</Kbd.Group>
		</div>
	</div>
{/snippet}

{#snippet animationTab()}
	{@const disabled = store.view === "collection"}
	<div
		class="w-full border border-r-black/0 {disabled
			? 'border-foreground/10'
			: 'border-foreground/50'} bg-canvas/80 py-2 px-4 rounded-l-lg"
	>
		<div class="flex gap-4 justify-between items-center">
			<ClapperboardIcon
				class="{disabled ? 'text-disabled-foreground' : ''} size-4"
			/>
			<Kbd.Group>
				<Key
					key={keybinds.Cutscene}
					disabled={store.view !== "skill" && store.view !== "bond"}
				/>
				<Key
					key={keybinds.Touch}
					disabled={store.view === "collection"}
				/>
			</Kbd.Group>
		</div>
		<BondProgressMeter />
	</div>
{/snippet}

<div
	class="text-foreground mr-4 flex flex-col gap-1 w-20 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	{@render children()}
	<BondProgressMeter className="!mt-1" />
</div>
