import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAssetCache, getAssetBytes } from "$lib/core/assetCache/assetCache";
import * as store from "$lib/core/assetCache/assetCacheStore";
import { getStoredBytes } from "$lib/core/assetCache/assetCacheStore";
import { defaultCacheSizeMB, setCacheSizeMB } from "$lib/core/cacheSettings.svelte";

function bytesOf(size: number, fill = 1): ArrayBuffer {
	return new Uint8Array(size).fill(fill).buffer;
}

function fetchResolving(bytes: ArrayBuffer) {
	return { ok: true, status: 200, arrayBuffer: () => Promise.resolve(bytes) };
}

beforeEach(async () => {
	await clearAssetCache();
	setCacheSizeMB(defaultCacheSizeMB);
	vi.restoreAllMocks();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("getAssetBytes", () => {
	it("fetches from the network on a miss", async () => {
		const bytes = bytesOf(16);
		const fetchMock = vi.fn().mockResolvedValue(fetchResolving(bytes));
		vi.stubGlobal("fetch", fetchMock);

		const result = await getAssetBytes("http://example.test/a.skel");

		expect(new Uint8Array(result)).toEqual(new Uint8Array(bytes));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("serves a repeat request from the hot cache without refetching", async () => {
		const fetchMock = vi.fn().mockResolvedValue(fetchResolving(bytesOf(16)));
		vi.stubGlobal("fetch", fetchMock);

		await getAssetBytes("http://example.test/b.skel");
		await getAssetBytes("http://example.test/b.skel");

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("de-dupes concurrent requests for the same url into a single fetch", async () => {
		const fetchMock = vi.fn().mockResolvedValue(fetchResolving(bytesOf(16)));
		vi.stubGlobal("fetch", fetchMock);

		const [a, b] = await Promise.all([
			getAssetBytes("http://example.test/c.skel"),
			getAssetBytes("http://example.test/c.skel"),
		]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(a).toBe(b);
	});

	it("evicts the least-recently-persisted entry once over the configured cap", async () => {
		setCacheSizeMB(1500 / (1024 * 1024));
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(fetchResolving(bytesOf(1000)))
				.mockResolvedValueOnce(fetchResolving(bytesOf(1000)))
		);

		await getAssetBytes("http://example.test/old.png");
		await getAssetBytes("http://example.test/new.png");

		expect(await getStoredBytes("http://example.test/old.png")).toBeUndefined();
		expect(await getStoredBytes("http://example.test/new.png")).toBeDefined();
	});

	it("does not persist an item larger than the configured cap", async () => {
		setCacheSizeMB(500 / (1024 * 1024));
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fetchResolving(bytesOf(1000))));

		await getAssetBytes("http://example.test/huge.png");

		expect(await getStoredBytes("http://example.test/huge.png")).toBeUndefined();
	});

	it("still returns fetched bytes if the persistent write fails (fail-open)", async () => {
		const bytes = bytesOf(16);
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fetchResolving(bytes)));
		vi.spyOn(store, "putStoredAsset").mockRejectedValueOnce(new Error("QuotaExceededError"));

		const result = await getAssetBytes("http://example.test/quota.skel");

		expect(new Uint8Array(result)).toEqual(new Uint8Array(bytes));
	});
});
