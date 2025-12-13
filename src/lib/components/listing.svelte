<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { type ColumnDef } from "@tanstack/table-core";
	import DataTable from "./data-table.svelte";
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { Button, buttonVariants } from "./ui/button/index";
	import { renderSnippet } from "./ui/data-table";
	import {
		addKeydownListener,
		clearAllFilters,
		nonEmptyFilterFn,
	} from "$lib/utils";
	import Key from "./key.svelte";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import { keybinds } from "$lib/keybinds";
	import Toggle from "./ui/toggle/toggle.svelte";
	import type { Entry } from "$lib/types";

	const _showDetails = localStorage.getItem("showDetails");
	const _showModels = localStorage.getItem("showModels");

	let open = $state(false);
	let showDetails = $state(_showDetails ? JSON.parse(_showDetails) : true);
	let showModels = $state(_showModels ? JSON.parse(_showModels) : true);
	let data = $derived(Object.values(store.map));

	onMount(() => {
		addKeydownListener((ev) => {
			if (ev.key === keybinds.Listing) {
				open = !open;
			}
		});
	});

	const columns: ColumnDef<Entry>[] = $derived.by(() => {
		const cols: ColumnDef<Entry>[] = [
			{
				id: "actions",
				cell: ({ row }) => {
					const id = row.original.id;
					const entry = store.map[id];
					const src = `/icons/hero_icons/${entry.icons.hero ?? "__No_Icon__.png"}`;
					return renderSnippet(viewButton, { id, src });
				},
			},
			{
				accessorKey: "Name",
				header: "Name",
				filterFn: nonEmptyFilterFn,
				enableColumnFilter: true,
			},
			{
				accessorKey: "ID",
				header: "ID",
				filterFn: nonEmptyFilterFn,
				enableColumnFilter: true,
			},
		];

		if (showDetails) {
			cols.push(
				...[
					{
						accessorKey: "Stars",
						header: "Stars",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Attribute",
						header: "Attribute",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Class",
						header: "Class",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Constellation",
						header: "Constellation",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Birthday",
						header: "Birthday",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Bust",
						header: "Bust",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Height",
						header: "Height",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "Weight",
						header: "Weight",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
				]
			);
		}

		if (showModels) {
			cols.push(
				...[
					{
						accessorKey: "alt",
						header: "Alt",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "skill",
						header: "Skill",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "bond",
						header: "Bond",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						accessorKey: "loveLinks",
						header: "Love Links",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
				]
			);
		}

		return cols;
	});

	function onclick(id: string) {
		const absoluteHeroIndex =
			Object.values(store.map).findIndex((h) => h.id === id) ?? 0;
		const relativeHeroIndex =
			store.filteredHeroData.findIndex((h) => h.id === id) ?? 0;

		store.modelState.absoluteHeroIndex = absoluteHeroIndex;
		store.modelState.relativeHeroIndex = relativeHeroIndex;
		store.modelState.handleModelChange("", true);
		open = false;
	}

	function persistTable(node: HTMLElement) {
		const container = document.getElementById("datatable-container");
		const table = container?.querySelector("#datatable");
		if (container && table) {
			node.appendChild(table);
		}

		return {
			destroy() {
				const table = node.querySelector("#datatable");
				if (container && table) {
					container.appendChild(table);
				}
			},
		};
	}

	$effect(() => {
		localStorage.setItem("showDetails", JSON.stringify(showDetails));
		localStorage.setItem("showModels", JSON.stringify(showModels));
	});
</script>

{#snippet viewButton({ id, src }: { id: string; src: string })}
	<Button
		onclick={() => onclick(id)}
		variant="ghost"
		class="cursor-pointer place-self-center flex gap-2 hover:!bg-background w-[4.5rem] !pr-0"
	>
		<Icon icon={"mdi:eye"} />
		<img
			{src}
			alt={id}
			width={36}
			height={36}
			class="rounded"
			loading="lazy"
		/>
	</Button>
{/snippet}

<div class="absolute bottom-0 left-0 m-4 bg-background rounded-lg">
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class={`${buttonVariants({ variant: "ghost" })} bg-canvas border border-foreground/10`}
		>
			Listing <Key key={keybinds.Listing} />
		</Dialog.Trigger>
		<Dialog.Content class="min-w-[80vw] max-w-[80vw]">
			<Dialog.Header>
				<Dialog.Title>Hero Catalog</Dialog.Title>
				<div class="flex justify-between mt-2">
					<div>
						<Toggle bind:pressed={showDetails}>Show Details</Toggle>
						<Toggle bind:pressed={showModels}>Show Models</Toggle>
					</div>
					<Button
						onclick={clearAllFilters}
						class="place-self-end w-min"
					>
						Clear All Filters
					</Button>
				</div>
			</Dialog.Header>
			<div
				class="w-full h-[70vh] overflow-x-hidden"
				use:persistTable
			></div>
		</Dialog.Content>
	</Dialog.Root>
</div>

<div id="datatable-container" class="hidden">
	<DataTable {columns} {data} bind:table={store.table!} />
</div>
