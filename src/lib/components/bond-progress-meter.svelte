<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { getBondRule } from "$lib/core/bondRules";
	import { dotState } from "$lib/core/bondProgress";

	let { className }: { className?: string } = $props();

	const entry = $derived(store.modelState.getAbsoluteEntry());
	const presentation = $derived(entry.bond?.[store.modelState.cycleIndex]);
	const rule = $derived(getBondRule(entry.id));

	const stillsActive = $derived(presentation?.kind === "stills");
	const animatedActive = $derived(
		presentation?.kind === "animated" &&
			!rule.disable &&
			!store.modelState.bondManualOverride,
	);

	const stageCount = $derived.by(() => {
		if (stillsActive && presentation?.kind === "stills") {
			return presentation.images.length;
		}
		if (animatedActive) {
			return store.modelState.bondStageCount;
		}
		return 0;
	});

	const meterKind = $derived(
		store.view !== "bond" || stageCount === 0
			? "plain"
			: stillsActive
				? "stills"
				: "animated",
	);

	const currentStage = $derived(
		meterKind === "stills"
			? store.modelState.bondAnimationIndex
			: store.modelState.bondStageIndex,
	);
</script>

{#if meterKind === "plain"}
	{@const disabled = store.view === "collection"}
	<div
		class="h-1 w-full {disabled
			? 'bg-disabled'
			: 'bg-foreground'} rounded-full mt-2 {className}"
	></div>
{:else}
	<div class="flex flex-col gap-2 w-full mt-2 {className}">
		<div class="flex gap-1">
			{#if meterKind === "stills"}
				<div class="flex-1 h-1 rounded-full bg-foreground"></div>
			{:else}
				{#each store.modelState.bondSequenceBars as bar, j (j)}
					{@const barState = dotState(
						j,
						store.modelState.bondActiveBarIndex,
					)}
					<div
						class="flex-1 h-1 rounded-full bg-muted-foreground/50 overflow-hidden"
					>
						<div
							class="h-full bg-foreground rounded-full"
							style="width: {barState === 'complete'
								? 100
								: barState === 'current'
									? store.modelState.bondBarProgress * 100
									: 0}%"
						></div>
					</div>
				{/each}
			{/if}
		</div>
		<div class="flex gap-1">
			{#each Array.from({ length: stageCount }) as _, i}
				{@const active = dotState(i, currentStage) !== "upcoming"}
				<div
					class="flex-1 h-1 rounded-full {active
						? 'bg-foreground'
						: 'bg-muted-foreground/50'}"
				></div>
			{/each}
		</div>
	</div>
{/if}
