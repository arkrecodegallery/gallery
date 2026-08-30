<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";
	import { getAssetObjectUrl } from "$lib/core/assetCache/assetCache";

	type Props = { path: string } & HTMLImgAttributes;

	const { path, ...rest }: Props = $props();

	let objectUrl = $state<string | undefined>(undefined);

	$effect(() => {
		let cancelled = false;
		let createdUrl: string | undefined;

		getAssetObjectUrl(path)
			.then((url) => {
				if (cancelled) {
					URL.revokeObjectURL(url);
					return;
				}
				createdUrl = url;
				objectUrl = url;
			})
			.catch(() => {
				if (!cancelled) objectUrl = path;
			});

		return () => {
			cancelled = true;
			if (createdUrl) URL.revokeObjectURL(createdUrl);
		};
	});
</script>

{#if objectUrl}
	<img src={objectUrl} {...rest} />
{/if}
