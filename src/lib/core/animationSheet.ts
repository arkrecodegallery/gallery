import type { Map as GalleryMap } from "./types";
import { buildBondAnimate } from "./bondAnimate";
import { skelName } from "./skelName";
import { parseSkeletonBinary } from "./skeletonParser";

export type AnimationSheetKind = "hero" | "alt" | "skill" | "bond";

export interface SkelRef {
	heroId: string;
	kind: AnimationSheetKind;
	/** Index into entry.bond, present only when kind === "bond". */
	bondIndex?: number;
	skel: string;
}

export interface AnimationSheetEntry extends SkelRef {
	/** Raw animation names, in the skeleton's own order. */
	animations: string[];
	/** Mirrors Animate.groups: groups[stage][entry] = alternate animation names for that stop/bypass step. */
	groups: string[][][];
	background: string[];
}

/** Every skel bundle with animations, in deterministic (map/entry) order. */
export function collectSkelRefs(map: GalleryMap): SkelRef[] {
	const refs: SkelRef[] = [];
	for (const [heroId, entry] of Object.entries(map)) {
		refs.push({ heroId, kind: "hero", skel: entry.hero.skel });
		if (entry.alt) {
			refs.push({ heroId, kind: "alt", skel: entry.alt.skel });
		}
		if (entry.skill) {
			refs.push({ heroId, kind: "skill", skel: entry.skill.skel });
		}
		entry.bond?.forEach((presentation, bondIndex) => {
			if (presentation.kind === "animated") {
				refs.push({
					heroId,
					kind: "bond",
					bondIndex,
					skel: presentation.bundle.skel,
				});
			}
		});
	}
	return refs;
}

/**
 * Parses every skel referenced by the map and groups its animations exactly
 * as the live app would (same Animate + bondRules pipeline), independent of
 * WebGL/atlas loading. fetchSkelBytes reads raw bytes for a container-relative
 * skel path - the caller supplies the platform-specific IO.
 */
export async function buildAnimationSheet(
	map: GalleryMap,
	fetchSkelBytes: (skelPath: string) => Promise<Uint8Array>
): Promise<AnimationSheetEntry[]> {
	const sheet: AnimationSheetEntry[] = [];

	for (const ref of collectSkelRefs(map)) {
		const bytes = await fetchSkelBytes(ref.skel);
		const skeletonData = parseSkeletonBinary(bytes);
		const { animate } = buildBondAnimate(skeletonData.animations, skelName(ref.skel));

		sheet.push({
			...ref,
			animations: skeletonData.animations.map((a) => a.name),
			groups: animate.groups.map((group) =>
				group.map((entry) => entry.animations.map((a) => a.name))
			),
			background: animate.background.map((a) => a.name),
		});
	}

	return sheet;
}
