import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ModelView } from "./core/types";
import type { Row, Table } from "@tanstack/table-core";
import { store } from "./hooks/state.svelte";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
	? Omit<T, "children">
	: T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

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

export function addKeydownListener(callback: (ev: KeyboardEvent) => void) {
	window.addEventListener("keydown", (ev) => {
		const tag = (ev.target as HTMLElement)?.tagName;
		const isInput =
			tag === "INPUT" ||
			tag === "TEXTAREA" ||
			(ev.target as HTMLElement).isContentEditable;

		if (isInput) {
			return;
		}

		callback(ev);
	});
}

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

export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}
