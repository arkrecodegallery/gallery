<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import { platform } from "$platform";
	import { onMount } from "svelte";
	import { Button, buttonVariants } from "./ui/button";
	import { toast } from "svelte-sonner";
	import { setupState } from "$lib/hooks/setup.svelte";
	import { clearAssetCache } from "$lib/core/assetCache/assetCache";

	const setup = platform.setup!;

	onMount(() => {
		setup.createGalleryDataDir();

		setup.isSetupComplete().then((ready) => {
			if (ready) setupState.setup = true;
		});
	});

	function processData() {
		toast.promise(
			setup.processGalleryDataDir().then(async (message) => {
				await clearAssetCache();
				return message;
			}),
			{
				loading: "Processing gallery data. This may take a while...",
				success: () => {
					setupState.setup = true;
					return "Successfully processed data!";
				},
				error: (err) => {
					return `Error: ${err}`;
				},
			}
		);
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: "default" })}>
		Setup
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Setup the Required Files</Dialog.Title>
		</Dialog.Header>
		<p>
			As per the <a
				href="https://github.com/arkrecodegallery/gallery/blob/main/README.md"
				class="underline text-blue-400">README</a
			>, set up the required files in the
			<span class="font-mono">AppLocalData</span>
			directory, under the <span class="font-mono">gallery-data</span> directory.
			This directory should be automatically generated, but if it is not, create
			it first.
		</p>
		<p>
			Once you've done that, close and re-open this popup. You should see
			a new button to process the files. This will read the assets and
			create a <span class="font-mono">map.json</span> file that the app
			can use to display models correctly. It will also create a
			<span class="font-mono">missing.json</span> file indicating possibly
			missing files.
		</p>
		<Dialog.Footer>
			<Button onclick={setup.revealGalleryDataDir}
				>Reveal Gallery Data Directory</Button
			>
			{#await setup.isGalleryDataDirReady() then ready}
				{#if ready}
					<Button onclick={processData}>Process Files</Button>
				{/if}
			{/await}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
