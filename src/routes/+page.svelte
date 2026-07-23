<script lang="ts">
	import Setup from "$lib/components/setup.svelte";
	import { Button } from "$lib/components/ui/button";
	import { setupState } from "$lib/hooks/setup.svelte";
	import { platform } from "$platform";
</script>

<div class="w-full h-full flex justify-center items-center">
	<div class="w-sm flex flex-col gap-2 justify-center items-center">
		<h1 class="text-xl font-bold">Gallery</h1>
		{#if platform.setup}
			<Setup />
		{/if}
		<Button href="/gallery" disabled={!setupState.setup}>Gallery</Button>
		<Button href="/settings" disabled={!setupState.setup}>Settings</Button>
	</div>
</div>
