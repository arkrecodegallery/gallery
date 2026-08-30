<script lang="ts">
	import { store } from "$lib/hooks/state.svelte";
	import { type ColumnDef } from "@tanstack/table-core";
	import DataTable from "../dataTable.svelte";
	import * as Dialog from "$lib/components/ui/dialog/index";
	import { Button } from "../ui/button/index";
	import { addKeydownListener } from "$lib/core/keybinds.svelte";
	import { clearAllFilters } from "./tableFilters";
	import { buildHeroColumns } from "./listingColumns";
	import { persistTable } from "./listingTableDom";
	import Key from "../key.svelte";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import { keybinds } from "$lib/core/keybinds.svelte";
	import Toggle from "../ui/toggle/toggle.svelte";
	import type { Entry } from "$lib/core/types";
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

	const columns: ColumnDef<Entry>[] = $derived.by(() =>
		buildHeroColumns(showDetails, showModels, viewButton)
	);

	function onclick(id: string) {
		store.modelState.navigation.selectHeroById(id);
		open = false;
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
	src: string;
	alt: string;
})}
	<Button
		onclick={() => onclick(id)}
		variant="ghost"
		class="cursor-pointer place-self-center flex gap-2 hover:!bg-background w-[4.5rem] !pr-0"
	>
		<Icon icon={"mdi:eye"} />
		<img
			src={src}
			alt={id}
			width={48}
			height={48}
			class="rounded"
			loading="lazy"
			onerror={(ev) => {
				const img = ev.currentTarget as HTMLImageElement;
				img.onerror = null;
				img.src = alt;
			}}
		/>
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
