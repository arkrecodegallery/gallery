import { describe, expect, it } from "vitest";
import { collectSkelRefs } from "$lib/core/animationSheet";
import type { Map as GalleryMap } from "$lib/core/types";

function bundle(skel: string) {
	return { skel, atlas: skel.replace(".skel", ".atlas") };
}

describe("collectSkelRefs", () => {
	it("collects hero, alt, skill, and animated bond skels, skipping stills", () => {
		const map: GalleryMap = {
			H003: {
				id: "H003",
				icons: { hero: "" },
				details: {} as GalleryMap["H003"]["details"],
				hero: bundle("H003.skel"),
				alt: bundle("H003b.skel"),
				skill: bundle("H003_skill.skel"),
				bond: [
					{ kind: "animated", bundle: bundle("A0001.skel"), motions: [] },
					{ kind: "stills", images: ["A0002_1.png"] },
					{ kind: "animated", bundle: bundle("A0003.skel"), motions: [] },
				],
			},
		};

		const refs = collectSkelRefs(map);

		expect(refs).toEqual([
			{ heroId: "H003", kind: "hero", skel: "H003.skel" },
			{ heroId: "H003", kind: "alt", skel: "H003b.skel" },
			{ heroId: "H003", kind: "skill", skel: "H003_skill.skel" },
			{ heroId: "H003", kind: "bond", bondIndex: 0, skel: "A0001.skel" },
			{ heroId: "H003", kind: "bond", bondIndex: 2, skel: "A0003.skel" },
		]);
	});

	it("only collects the main hero bundle when alt/skill/bond are absent", () => {
		const map: GalleryMap = {
			H004: {
				id: "H004",
				icons: { hero: "" },
				details: {} as GalleryMap["H004"]["details"],
				hero: bundle("H004.skel"),
			},
		};

		expect(collectSkelRefs(map)).toEqual([
			{ heroId: "H004", kind: "hero", skel: "H004.skel" },
		]);
	});
});
