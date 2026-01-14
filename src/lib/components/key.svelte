<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import * as Kbd from "./ui/kbd/index";

	type Props = {
		key: string;
		disabled?: boolean;
	} & HTMLAttributes<HTMLElement>;

	const { key, disabled, ...rest }: Props = $props();
</script>

<Kbd.Root {...rest} class={disabled ? "bg-disabled text-disabled-foreground" : ""}>
	{key}
</Kbd.Root>
