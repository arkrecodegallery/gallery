import type { Row } from "@tanstack/table-core";
import { store } from "$lib/hooks/state.svelte";

export const nonEmptyFilterFn = <TData>(
	row: Row<TData>,
	columnId: string,
	filterValue: any
): boolean => {
	if (filterValue === "__nonempty__") {
		return (row.getValue(columnId)?.toString().trim().length ?? 0) > 0;
	}
	if (!filterValue) return true;
	return (
		row
			.getValue(columnId)
			?.toString()
			.toLowerCase()
			.includes(filterValue.toLowerCase()) || false
	);
};

export function clearAllFilters() {
	store.table?.setSorting([]);
	store.table
		?.getAllColumns()
		.forEach((col) => col.setFilterValue(undefined));
	Object.values(store.menuStates).forEach((state) => {
		state.value = "";
		state.nonEmpty = false;
		state.asc = false;
		state.desc = false;
	});
}
