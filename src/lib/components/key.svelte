<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import * as Kbd from "./ui/kbd/index";

	type Props = {
		key: string;
		disabled?: boolean;
	} & HTMLAttributes<HTMLElement>;

	const { key, disabled, ...rest }: Props = $props();
</script>

<Kbd.Root>{key}</Kbd.Root>

<!-- <kbd
	{...rest}
	class={`border rounded leading-none align-middle px-1 pb-1 pt-0.5 border-b-2 ${rest.class} ${disabled ? "border-border text-border" : "border-foreground"}`}
>
	{key}
</kbd> -->
