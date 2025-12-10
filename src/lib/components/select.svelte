<script lang="ts">
	import * as Select from "$lib/components/ui/select/index.js";
	import type { HTMLAttributes } from "svelte/elements";
	type Props = {
		values: string[];
		selected: string;
		onchange: () => void;
		name: string;
	} & HTMLAttributes<HTMLElement>;

	let {
		name,
		values,
		selected = $bindable(),
		onchange,
		...rest
	}: Props = $props();
</script>

<Select.Root
	{...rest}
	type="single"
	onValueChange={onchange}
	bind:value={selected}
>
	<Select.Trigger>{selected}</Select.Trigger>
	<Select.Content>
		{#each values as value}
			<Select.Item {value}>{value}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
