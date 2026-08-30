<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { Kbd } from "$lib/components/ui/kbd";
	import { toast } from "svelte-sonner";
	import {
		keybinds,
		keybindLabels,
		setKeybind,
		resetKeybinds,
		type KeybindAction,
	} from "$lib/core/keybinds.svelte";
	import {
		cacheSettings,
		cacheSizePresetsMB,
		setCacheSizeMB,
	} from "$lib/core/cacheSettings.svelte";
	import { clearAssetCache } from "$lib/core/assetCache/assetCache";

	const actions = Object.keys(keybindLabels) as KeybindAction[];

	function onClearCache() {
		toast.promise(clearAssetCache(), {
			loading: "Clearing cached assets...",
			success: "Cache cleared.",
			error: "Failed to clear cache.",
		});
	}

	let listeningFor = $state<KeybindAction | null>(null);

	const duplicateKeys = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const action of actions) {
			const key = keybinds[action];
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return new Set(
			[...counts.entries()]
				.filter(([, count]) => count > 1)
				.map(([key]) => key),
		);
	});

	function onWindowKeydown(ev: KeyboardEvent) {
		if (!listeningFor) return;
		ev.preventDefault();

		if (ev.key === "Escape") {
			listeningFor = null;
			return;
		}
		if (["Shift", "Control", "Alt", "Meta"].includes(ev.key)) return;

		setKeybind(listeningFor, ev.key);
		listeningFor = null;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="w-dvw h-dvh flex justify-center items-center overflow-hidden">
	<div class="w-sm flex flex-col gap-4 py-4">
		<h1 class="text-xl font-bold">Settings</h1>

		<ScrollArea class="h-[50dvh]">
			<div class="flex flex-col gap-2 py-1">
				{#each actions as action (action)}
					<div
						class="flex justify-between items-center gap-2 border border-foreground/10 rounded-[8px] px-4 py-2"
					>
						<span class="text-sm">{keybindLabels[action]}</span>
						<Button
							variant="outline"
							size="sm"
							class="min-w-24"
							onclick={() => (listeningFor = action)}
						>
							{#if listeningFor === action}
								Press a key…
							{:else}
								<Kbd
									class={duplicateKeys.has(keybinds[action])
										? "bg-destructive/20 text-destructive"
										: ""}
								>
									{keybinds[action]}
								</Kbd>
							{/if}
						</Button>
					</div>
				{/each}
			</div>
		</ScrollArea>

		{#if duplicateKeys.size > 0}
			<p class="text-sm text-destructive">
				Some actions share the same key. Whichever handler fires first
				for that view will win.
			</p>
		{/if}

		<div class="flex flex-col gap-2 border-t border-foreground/10 pt-4">
			<h2 class="text-sm font-semibold">Asset Cache</h2>
			<div class="flex flex-wrap gap-2">
				{#each cacheSizePresetsMB as sizeMB (sizeMB)}
					<Button
						variant={cacheSettings.maxSizeMB === sizeMB ? "default" : "outline"}
						size="sm"
						onclick={() => setCacheSizeMB(sizeMB)}
					>
						{sizeMB} MB
					</Button>
				{/each}
			</div>
			<Button variant="outline" size="sm" onclick={onClearCache}>
				Clear Cache
			</Button>
		</div>

		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={resetKeybinds}>
				Reset to Defaults
			</Button>
			<Button href="/">Back</Button>
		</div>
	</div>
</div>
