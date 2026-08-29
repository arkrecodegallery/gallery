import { store } from "$lib/hooks/state.svelte";

export function persistTable(node: HTMLElement) {
	const container = document.getElementById("datatable-container");
	const table = container?.querySelector<HTMLElement>("#datatable");
	if (container && table) {
		node.appendChild(table);
		scrollToSelectedHero(table);
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

function scrollToSelectedHero(table: HTMLElement) {
	const index = store.modelState.heroSelection.absoluteHeroIndex;
	const row = table.querySelector<HTMLElement>(
		`[data-row-index="${index}"]`
	);
	if (!row) return;

	const header = table.querySelector<HTMLElement>("thead");
	table.scrollTop = row.offsetTop - (header?.offsetHeight ?? 0);
}
