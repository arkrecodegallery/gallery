<script lang="ts" generics="TData, TValue">
	import * as Popover from "$lib/components/ui/popover/index";
	import { Button } from "$lib/components/ui/button/index";
	import { Toggle } from "$lib/components/ui/toggle/index.js";
	import Icon from "@iconify/svelte";
	import type { Table, Column } from "@tanstack/table-core";
	import Input from "../ui/input/input.svelte";
	import { store } from "$lib/hooks/state.svelte";
	import { onMount } from "svelte";
	import { persistFilterMenuState } from "./filterMenuState";

	interface Props {
		table: Table<TData>;
		column: Column<TData, TValue>;
	}

	const { table, column }: Props = $props();

	let value = $state((column.getFilterValue() as string) ?? "");
	let nonEmpty = $state(false);
	let asc = $state(false);
	let desc = $state(false);

	onMount(() => {
		if (store.menuStates[column.id]) {
			value = store.menuStates[column.id].value;
			nonEmpty = store.menuStates[column.id].nonEmpty;
			asc = store.menuStates[column.id].asc;
			desc = store.menuStates[column.id].desc;

			if (value || nonEmpty) {
				if (nonEmpty) {
					value = "__nonempty__";
				}
				column.setFilterValue(value);
			}
			if (asc || desc) {
				store.sorting = [
					...store.sorting,
					{ id: column.id, desc: desc },
				];
			}
		} else {
			store.menuStates[column.id] = {
				value,
				nonEmpty,
				asc,
				desc,
			};
		}
	});

	$effect(() => {
		value = store.menuStates[column.id].value;
		nonEmpty = store.menuStates[column.id].nonEmpty;
		asc = store.menuStates[column.id].asc;
		desc = store.menuStates[column.id].desc;
	});

	function setSorting(_desc: boolean) {
		const index = store.sorting.findIndex((s) => s.id === column.id);
		const off = !asc && !desc;

		if (!off) {
			if (index >= 0) {
				store.sorting[index].desc = _desc;
				table.setSorting([...store.sorting]);
			} else {
				table.setSorting([{ id: column.id, desc: _desc }]);
			}
			asc = !_desc;
			desc = _desc;
		} else {
			if (index >= 0) {
				store.sorting.splice(index, 1);
				table.setSorting([...store.sorting]);
			}
		}

		persistFilterMenuState(column.id, { asc, desc });
	}

	function applyFilter(setNonEmpty: boolean) {
		if (setNonEmpty) {
			if (nonEmpty) {
				value = "__nonempty__";
				column.setFilterValue("__nonempty__");
			} else {
				value = "";
				column.setFilterValue("");
			}
		} else {
			column.setFilterValue(value || undefined);
		}

		persistFilterMenuState(column.id, { value, nonEmpty });
	}

	function clearFilter() {
		nonEmpty = false;
		value = "";
		column.setFilterValue(undefined);

		asc = false;
		desc = false;
		const index = store.sorting.findIndex((s) => s.id === column.id);
		if (index >= 0) {
			store.sorting.splice(index, 1);
			table.setSorting([...store.sorting]);
		}

		persistFilterMenuState(column.id, { value, nonEmpty, asc, desc });
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		<Button variant="ghost" size="sm" class="ml-1">
			<Icon icon="mdi:filter-variant" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="p-3 w-56 space-y-2">
		<div class="flex flex-col gap-2">
			<Input
				type="text"
				placeholder="Filter value..."
				class="border rounded px-3 py-1 w-full"
				bind:value
				oninput={() => applyFilter(false)}
				disabled={nonEmpty}
			/>
			<Toggle
				bind:pressed={nonEmpty}
				onPressedChange={() => applyFilter(true)}
				class="text-center"
				variant="outline"
			>
				Non-Empty Only
			</Toggle>

			<Toggle
				bind:pressed={asc}
				onPressedChange={() => setSorting(false)}
				variant="outline">Order Asc</Toggle
			>
			<Toggle
				bind:pressed={desc}
				onPressedChange={() => setSorting(true)}
				variant="outline">Order Desc</Toggle
			>

			<Button onclick={clearFilter} variant="ghost">Clear</Button>
		</div>
	</Popover.Content>
</Popover.Root>
