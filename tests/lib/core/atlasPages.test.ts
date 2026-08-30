import { describe, expect, it } from "vitest";
import { parseAtlasPageImages } from "$lib/core/atlasPages";

describe("parseAtlasPageImages", () => {
	it("returns the page image filename for a single-page atlas", () => {
		const atlasText = [
			"hero.png",
			"size: 2048,2048",
			"format: RGBA8888",
			"filter: Linear,Linear",
			"repeat: none",
			"regionA",
			"  rotate: false",
			"  xy: 2, 2",
			"  size: 100, 100",
			"  orig: 100, 100",
			"  offset: 0, 0",
			"  index: -1",
		].join("\n");

		expect(parseAtlasPageImages(atlasText)).toEqual(["hero.png"]);
	});

	it("returns one filename per page, separated by a blank line", () => {
		const atlasText = [
			"page1.png",
			"size: 1024,1024",
			"regionA",
			"  xy: 0, 0",
			"",
			"page2.png",
			"size: 1024,1024",
			"regionB",
			"  xy: 0, 0",
		].join("\n");

		expect(parseAtlasPageImages(atlasText)).toEqual(["page1.png", "page2.png"]);
	});

	it("returns an empty list for empty input", () => {
		expect(parseAtlasPageImages("")).toEqual([]);
	});
});
