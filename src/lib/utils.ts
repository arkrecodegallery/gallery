import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Entry, ModelView } from "./core/types";
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

const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function prettyBirthday(entry: Entry) {
	if (!entry.details.birthday) return "";

	try {
		const split = entry.details.birthday.split(" / ");
		if (split.length != 2) throw "";

		const monthIndex = Number(split[0]) - 1;
		if (Number.isNaN(monthIndex) || monthIndex >= months.length) throw "";

		const day = Number(split[1]);
		if (Number.isNaN(day) || day > 31) throw "";

		return `${months[monthIndex]} ${day}`;
	} catch {
		return entry.details.birthday;
	}
}

export function imperialHeight(entry: Entry) {
	if (!entry.details.height) return "";

	try {
		let height = entry.details.height;
		if (!height.endsWith(" cm")) throw "";
		height = height.substring(0, height.length - 3);

		const cm = Number(height);
		if (Number.isNaN(cm)) throw "";

		const total = Math.round(cm / 2.54);
		const feet = Math.floor(total / 12);
		const inch = Math.floor(total % 12);
		return `${feet.toFixed(0)}' ${inch.toFixed(0)}\"`;
	} catch {
		return entry.details.height;
	}
}

export function imperialWeight(entry: Entry) {
	if (!entry.details.weight) return "";

	try {
		let weight = entry.details.weight;
		if (!weight.endsWith(" kg")) throw "";
		weight = weight.substring(0, weight.length - 3);

		const kg = Number(weight);
		if (Number.isNaN(kg)) throw "";

		const total = Math.round(kg * 2.205);
		return `${total.toFixed(0)} lb`;
	} catch {
		return entry.details.weight;
	}
}

export function fileName(path: string | undefined): string {
	if (!path) return "";
	const spl = path.split("/");
	const file = spl[spl.length - 1];
	return file.substring(0, file.indexOf("."));
}
