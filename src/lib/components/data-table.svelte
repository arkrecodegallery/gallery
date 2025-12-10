<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		type Table as TableType,
		getCoreRowModel,
		getSortedRowModel,
		getFilteredRowModel,
	} from "@tanstack/table-core";
	import {
		createSvelteTable,
		FlexRender,
	} from "$lib/components/ui/data-table/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import FilterMenu from "./filterMenu.svelte";
	import { store } from "$lib/hooks/state.svelte";

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		table: TableType<TData>;
	};

	let {
		data,
		columns,
		table = $bindable(),
	}: DataTableProps<TData, TValue> = $props();

	function createTable() {
		return createSvelteTable({
			get data() {
				return data;
			},
			columns,
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
			getFilteredRowModel: getFilteredRowModel(),
			onSortingChange: (updater) => {
				if (typeof updater === "function") {
					store.sorting = updater(store.sorting);
				} else {
					store.sorting = updater;
				}
			},
			onColumnFiltersChange: (updater) => {
				if (typeof updater === "function") {
					store.columnFilters = updater(store.columnFilters);
				} else {
					store.columnFilters = updater;
				}
			},
			state: {
				get sorting() {
					return store.sorting;
				},
				get columnFilters() {
					return store.columnFilters;
				},
			},
		});
	}

	$effect(() => {
		(() => [columns])();
		table = createTable();
	});
	table = createTable();
</script>

<div id="datatable" class="w-full h-full rounded-md border overflow-auto relative">
	<Table.Root>
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						<Table.Head
							colspan={header.colSpan}
							class="font-bold bg-muted first:rounded-tl-md last:rounded-tr-md py-2 items-center sticky top-0 z-[100] first:sticky first:left-0 first:z-[101]"
						>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
							{#if header.column.getCanFilter?.()}
								<FilterMenu {table} column={header.column} />
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<Table.Row data-state={row.getIsSelected() && "selected"}>
					{#each row.getVisibleCells() as cell (cell.id)}
						<Table.Cell class="first:sticky first:left-0 first:bg-background first:pr-3">
							<FlexRender
								content={cell.column.columnDef.cell}
								context={cell.getContext()}
							/>
						</Table.Cell>
					{/each}
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell
						colspan={columns.length}
						class="h-24 text-center"
					>
						No results.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
