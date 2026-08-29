import { type ColumnDef } from "@tanstack/table-core";
import type { Snippet } from "svelte";
import { renderSnippet } from "./ui/data-table";
import { fileName } from "$lib/utils";
import { imperialHeight, imperialWeight } from "$lib/core/format";
import { nonEmptyFilterFn } from "./tableFilters";
import type { Entry } from "$lib/core/types";

export type ViewButtonProps = { id: string; src: string; alt: string };

export function buildHeroColumns(
	showDetails: boolean,
	showModels: boolean,
	viewButton: Snippet<[ViewButtonProps]>
): ColumnDef<Entry>[] {
	const cols: ColumnDef<Entry>[] = [
		{
			id: "actions",
			cell: ({ row }) => {
				const id = row.original.id;
				const src = `/icons/heroes/${id}.png`;
				const alt = `/icons/__No_Icon__.png`;
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
							b.kind === "stills"
								? fileName(b.images[0])
								: fileName(b.bundle.atlas)
						),
					header: "Bond",
					filterFn: nonEmptyFilterFn,
					enableColumnFilter: true,
				},
				{
					id: "collection",
					accessorFn: (row) => row.collection?.map((c) => fileName(c)),
					header: "Collection",
					filterFn: nonEmptyFilterFn,
					enableColumnFilter: true,
				},
			] satisfies ColumnDef<Entry>[])
		);
	}

	return cols;
}
