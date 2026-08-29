<script lang="ts">
	import { keybinds } from "$lib/core/keybinds.svelte";
	import { store } from "$lib/hooks/state.svelte";
	import Key from "$lib/components/key.svelte";
	import * as Kbd from "$lib/components/ui/kbd/index.js";
	import Select from "$lib/components/select.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { Button } from "./ui/button";
	import { ClapperboardIcon, ShirtIcon } from "@lucide/svelte";
	import ProgressMeter from "$lib/components/progress-meter.svelte";
	import { fileName } from "$lib/utils";
	import {
		computeDisplayStages,
		isBridgedGap as isBridgedGapAt,
		stageBarClass as stageBarClassAt,
	} from "./controlsDisplay";

	const skins = $derived(store.skeletonData?.skins ?? []);
	const animations = $derived(store.skeletonData?.animations ?? []);
	const stageMap = $derived(store.modelState.frameSync.animationStageMap());
	const skinDisabled = $derived(
		store.view !== "hero" && store.view !== "alt",
	);
	const animationDisabled = $derived(store.view === "collection");
	const stillsPresentation = $derived.by(() => {
		const presentation = store.modelState.frameSync.getBondPresentation();
		return presentation?.kind === "stills" ? presentation : undefined;
	});

	const displayStages = $derived(computeDisplayStages(stageMap, animations));

	function stageBarClass(index: number): string | undefined {
		return stageBarClassAt(displayStages, index);
	}

	function isBridgedGap(index: number): boolean {
		return isBridgedGapAt(displayStages, stageMap, animations, index);
	}

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
			<DropdownMenu.Trigger
				disabled={skinDisabled}
				class="w-full cursor-pointer rounded-l-lg disabled:cursor-default"
			>
				{@render skinTab()}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.RadioGroup
					bind:value={store.modelState.skinState.skin}
					onValueChange={() => store.modelState.input.confirmManualSkinPick()}
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
			<DropdownMenu.Trigger
				disabled={animationDisabled}
				class="w-full cursor-pointer rounded-l-lg disabled:cursor-default"
			>
				{@render animationTab()}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				{#if stillsPresentation}
					{#each stillsPresentation.images as image, i}
						<DropdownMenu.CheckboxItem
							checked={i === store.modelState.bond.stillsIndex}
							onCheckedChange={(checked) =>
								checked && store.modelState.input.setStillsChecked(i)}
							closeOnSelect={false}
						>
							{fileName(image)}
						</DropdownMenu.CheckboxItem>
					{/each}
				{:else}
					{#each animations as anim, i}
						{@const bar = stageBarClass(i)}
						{@const gap = isBridgedGap(i)}
						<DropdownMenu.CheckboxItem
							checked={anim.name in store.modelState.checkboxAnimations.animations}
							onCheckedChange={(checked) =>
								store.modelState.input.setAnimationChecked(
									anim.name,
									checked,
									shiftHeld,
								)}
							closeOnSelect={false}
						>
							{#if bar}
								<span
									class={bar}
									style={gap
										? "mask-image: radial-gradient(130% 90% at center, transparent 14px, black 7px); -webkit-mask-image: radial-gradient(130% 90% at center, transparent 14px, black 7px);"
										: undefined}
								></span>
							{/if}
							{anim.name}
						</DropdownMenu.CheckboxItem>
					{/each}
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>

{#snippet skinTab()}
	{@const disabled = skinDisabled}
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
	{@const disabled = animationDisabled}
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
					disabled={store.view === "collection" ||
						!!stillsPresentation}
				/>
				<Key
					key={keybinds.Touch}
					disabled={store.view === "collection"}
				/>
			</Kbd.Group>
		</div>
		<ProgressMeter />
	</div>
{/snippet}

<div
	class="text-foreground mr-4 flex flex-col gap-1 w-20 z-10 {store.uiState !==
	'minimal'
		? 'hidden'
		: ''}"
>
	{@render children()}
	<ProgressMeter className="!mt-1" />
</div>
