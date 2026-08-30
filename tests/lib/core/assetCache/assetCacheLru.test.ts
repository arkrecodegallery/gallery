import { describe, expect, it } from "vitest";
import { insertMapLru, selectEvictions, touchMapLru } from "$lib/core/assetCache/assetCacheLru";
import type { CacheMeta } from "$lib/core/assetCache/assetCacheLru";

describe("selectEvictions", () => {
	it("evicts nothing when under the cap", () => {
		const entries: CacheMeta[] = [{ url: "a", size: 100, lastAccessed: 1 }];
		expect(selectEvictions(entries, 50, 1000)).toEqual([]);
	});

	it("evicts the oldest entries first until back under the cap", () => {
		const entries: CacheMeta[] = [
			{ url: "old", size: 400, lastAccessed: 1 },
			{ url: "mid", size: 400, lastAccessed: 2 },
			{ url: "new", size: 400, lastAccessed: 3 },
		];

		// 3 * 400 existing + 400 incoming = 1600 > 1000, so both "old" and
		// "mid" must go to get back to 800 <= 1000.
		expect(selectEvictions(entries, 400, 1000)).toEqual(["old", "mid"]);
	});

	it("evicts everything if the incoming item alone can't fit", () => {
		const entries: CacheMeta[] = [{ url: "a", size: 100, lastAccessed: 1 }];
		expect(selectEvictions(entries, 5000, 1000)).toEqual(["a"]);
	});
});

describe("touchMapLru", () => {
	it("moves an existing key to the end (most recently used)", () => {
		const map = new Map([
			["a", 1],
			["b", 2],
		]);

		touchMapLru(map, "a");

		expect([...map.keys()]).toEqual(["b", "a"]);
	});

	it("does nothing for a key that isn't present", () => {
		const map = new Map([["a", 1]]);
		touchMapLru(map, "missing");
		expect([...map.keys()]).toEqual(["a"]);
	});
});

describe("insertMapLru", () => {
	const sizeOf = (n: number) => n;

	it("inserts under the cap without evicting", () => {
		const map = new Map<string, number>();
		insertMapLru(map, "a", 10, sizeOf, 100);
		expect([...map.entries()]).toEqual([["a", 10]]);
	});

	it("evicts the oldest entry once the cap is exceeded", () => {
		const map = new Map<string, number>([
			["a", 40],
			["b", 40],
		]);

		insertMapLru(map, "c", 40, sizeOf, 100);

		expect([...map.keys()]).toEqual(["b", "c"]);
	});

	it("never evicts the entry currently being inserted", () => {
		const map = new Map<string, number>();
		insertMapLru(map, "a", 1000, sizeOf, 100);
		expect([...map.keys()]).toEqual(["a"]);
	});
});
