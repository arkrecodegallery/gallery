<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { type ColumnDef } from "@tanstack/table-core";
	import DataTable from "./data-table.svelte";
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { Button } from "./ui/button/index";
	import { renderSnippet } from "./ui/data-table";
	import {
		addKeydownListener,
		clearAllFilters,
		fileName,
		imperialHeight,
		imperialWeight,
		nonEmptyFilterFn,
	} from "$lib/utils";
	import Key from "./key.svelte";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import { keybinds } from "$lib/core/keybinds";
	import Toggle from "./ui/toggle/toggle.svelte";
	import type { Entry } from "$lib/core/types";
	import {
		ASSET_PROTOCOL,
		DIR_CONTAINERS,
		PATH_GALLERY_DATA,
	} from "$lib/core/constants";
	import { goto } from "$app/navigation";

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
		addKeydownListener((ev) => {
			if (ev.key === keybinds.Hide_UI) {
				hideUI();
			}
		});
		addKeydownListener((ev) => {
			if (ev.key === keybinds.Home) {
				goto("/");
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
					const src = PATH_GALLERY_DATA(
						DIR_CONTAINERS,
						entry.icons.hero
					);
					const alt = `/icons/hero_icons/__No_Icon__.png`;
					return renderSnippet(viewButton, { id, src, alt });
				},
			},
			{
				id: "Name",
				accessorFn: (row) => row.details.name,
				header: "Name",
				filterFn: nonEmptyFilterFn,
				enableColumnFilter: true,
			},
			{
				accessorKey: "id",
				header: "ID",
				filterFn: nonEmptyFilterFn,
				enableColumnFilter: true,
			},
		];

		if (showDetails) {
			cols.push(
				...([
					{
						id: "Stars",
						accessorFn: (row) => row.details.stars,
						header: "Stars",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Element",
						accessorFn: (row) => row.details.element,
						header: "Element",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Job",
						accessorFn: (row) => row.details.job,
						header: "Job",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Constellation",
						accessorFn: (row) => row.details.constellation,
						header: "Constellation",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Birthday",
						accessorFn: (row) => row.details.birthday,
						header: "Birthday",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Cup Size",
						accessorFn: (row) => row.details.cup_size,
						header: "Cup Size",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Height",
						accessorFn: (row) => imperialHeight(row),
						header: "Height",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "Weight",
						accessorFn: (row) => imperialWeight(row),
						header: "Weight",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
				] satisfies ColumnDef<Entry>[])
			);
		}

		if (showModels) {
			cols.push(
				...([
					{
						id: "alt",
						accessorFn: (row) => fileName(row.alt?.atlas),
						header: "Alt",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "skill",
						accessorFn: (row) => fileName(row.skill?.atlas),
						header: "Skill",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "bond",
						accessorFn: (row) =>
							row.bond?.map((b) =>
								b[0] === null
									? fileName(b[1][0])
									: fileName(b[0]?.atlas)
							),
						header: "Bond",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
					{
						id: "collection",
						accessorFn: (row) =>
							row.collection?.map((c) => fileName(c)),
						header: "Collection",
						filterFn: nonEmptyFilterFn,
						enableColumnFilter: true,
					},
				] satisfies ColumnDef<Entry>[])
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

	function hideUI() {
		if (store.uiState === "visible") {
			store.uiState = "minimal";
		} else if (store.uiState === "minimal") {
			store.uiState = "hidden";
		} else {
			store.uiState = "visible";
		}
	}

	$effect(() => {
		localStorage.setItem("showDetails", JSON.stringify(showDetails));
		localStorage.setItem("showModels", JSON.stringify(showModels));
	});

	const buttonStyle =
		"bg-canvas/80 hover:bg-canvas border border-foreground/10 text-foreground py-2 px-4 rounded-[8px] text-sm flex gap-2 justify-between items-center";
</script>

{#snippet viewButton({
	id,
	src,
	alt,
}: {
	id: string;
	src: Promise<string>;
	alt: string;
})}
	<Button
		onclick={() => onclick(id)}
		variant="ghost"
		class="cursor-pointer place-self-center flex gap-2 hover:!bg-background w-[4.5rem] !pr-0"
	>
		<Icon icon={"mdi:eye"} />
		{#await src then src}
			<img
				src={src ? `${ASSET_PROTOCOL}/${src}` : alt}
				alt={id}
				width={48}
				height={48}
				class="rounded"
				loading="lazy"
			/>
		{/await}
	</Button>
{/snippet}

<div
	class="ml-4 w-fit rounded-lg flex flex-col gap-4 z-10 {store.uiState !==
	'visible'
		? 'hidden'
		: ''}"
>
	<button class={buttonStyle} onclick={() => goto("/")}>
		Home <Key key={keybinds.Home} />
	</button>
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class="bg-canvas/80 hover:bg-canvas border border-foreground/10 text-foreground py-2 px-4 rounded-[8px] text-sm flex justify-between"
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
	<button onclick={hideUI} class={buttonStyle}>
		Hide UI <Key key={keybinds.Hide_UI} />
	</button>
</div>

<div id="datatable-container" class="hidden">
	<DataTable {columns} {data} bind:table={store.table!} />
</div>
