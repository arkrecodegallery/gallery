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
	import { cn, fileName } from "$lib/utils";

	const skins = $derived(store.skeletonData?.skins ?? []);
	const animations = $derived(store.skeletonData?.animations ?? []);
	const stageMap = $derived(store.modelState.animationStageMap());
	const skinDisabled = $derived(
		store.view !== "hero" && store.view !== "alt",
	);
	const animationDisabled = $derived(store.view === "collection");
	const stillsPresentation = $derived.by(() => {
		const presentation = store.modelState.getBondPresentation();
		return presentation?.kind === "stills" ? presentation : undefined;
	});

	// stageMap has no entry for skipped animations (e.g. touch/emo), which
	// splits one visual group in two; bridge gaps enclosed by the same
	// stage on both sides so the group reads as continuous around them
	const displayStages = $derived.by(() => {
		if (!stageMap) return undefined;
		const stages = animations.map((a) => stageMap.get(a.name));
		const filled = [...stages];

		let i = 0;
		while (i < filled.length) {
			if (filled[i] !== undefined) {
				i++;
				continue;
			}
			let j = i;
			while (j < filled.length && filled[j] === undefined) j++;

			const before = i > 0 ? filled[i - 1] : undefined;
			const after = j < filled.length ? stages[j] : undefined;
			if (before !== undefined && before === after) {
				filled.fill(before, i, j);
			}
			i = j;
		}

		return filled;
	});

	function stageBarClass(index: number): string | undefined {
		const stage = displayStages?.[index];
		if (stage === undefined) return undefined;

		const isFirst = stage !== displayStages?.[index - 1];
		const isLast = stage !== displayStages?.[index + 1];

		return cn(
			"pointer-events-none absolute left-1 w-5.5 bg-foreground/20",
			isFirst ? "top-1 rounded-t-full" : "top-0 rounded-t-none",
			isLast ? "bottom-1 rounded-b-full" : "bottom-0 rounded-b-none",
		);
	}

	function isBridgedGap(index: number): boolean {
		return (
			displayStages?.[index] !== undefined &&
			stageMap?.get(animations[index].name) === undefined
		);
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
								checked && store.modelState.setStillsChecked(i)}
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
							checked={anim.name in store.modelState.animations}
							onCheckedChange={(checked) =>
								store.modelState.setAnimationChecked(
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
