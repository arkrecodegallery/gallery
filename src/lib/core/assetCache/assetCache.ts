import { getCacheSizeBytes } from "../cacheSettings.svelte";
import { insertMapLru, selectEvictions, touchMapLru } from "./assetCacheLru";
import {
	clearStore,
	deleteStoredAsset,
	getStoredBytes,
	putStoredAsset,
	touchMeta,
} from "./assetCacheStore";
import {
	getMetaIndex,
	removeFromMetaIndex,
	resetMetaIndex,
	upsertMetaIndex,
} from "./metaIndexCache";
import type { CacheMeta } from "./assetCacheLru";

const HOT_CACHE_MAX_BYTES = 80 * 1024 * 1024;

const hotCache = new Map<string, ArrayBuffer>();
const inFlight = new Map<string, Promise<ArrayBuffer>>();

async function readFromPersistent(url: string): Promise<ArrayBuffer | undefined> {
	try {
		const bytes = await getStoredBytes(url);
		if (!bytes) return undefined;

		const meta = (await getMetaIndex()).find((entry) => entry.url === url);
		if (meta) {
			meta.lastAccessed = Date.now();
			await touchMeta(meta).catch(() => {});
		}
		return bytes;
	} catch {
		return undefined;
	}
}

async function writeToPersistent(url: string, bytes: ArrayBuffer) {
	try {
		const capBytes = getCacheSizeBytes();
		if (bytes.byteLength > capBytes) return;

		const index = await getMetaIndex();
		const evictions = selectEvictions(
			index.filter((entry) => entry.url !== url),
			bytes.byteLength,
			capBytes
		);
		for (const evictedUrl of evictions) {
			await deleteStoredAsset(evictedUrl).catch(() => {});
			removeFromMetaIndex(evictedUrl);
		}

		const meta: CacheMeta = { url, size: bytes.byteLength, lastAccessed: Date.now() };
		await putStoredAsset(meta, bytes);
		upsertMetaIndex(meta);
	} catch {
		// caching is best-effort; a write failure must never fail the caller
	}
}

async function fetchFromNetwork(url: string): Promise<ArrayBuffer> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch asset: ${url} (${response.status})`);
	return response.arrayBuffer();
}

export function peekHotCache(url: string): ArrayBuffer | undefined {
	const bytes = hotCache.get(url);
	if (bytes) touchMapLru(hotCache, url);
	return bytes;
}

export async function getAssetBytes(url: string): Promise<ArrayBuffer> {
	const hot = peekHotCache(url);
	if (hot) return hot;

	const pending = inFlight.get(url);
	if (pending) return pending;

	const promise = (async () => {
		const persisted = await readFromPersistent(url);
		const bytes = persisted ?? (await fetchFromNetwork(url));

		insertMapLru(hotCache, url, bytes, (entry) => entry.byteLength, HOT_CACHE_MAX_BYTES);
		if (!persisted) await writeToPersistent(url, bytes);

		return bytes;
	})();

	inFlight.set(url, promise);
	try {
		return await promise;
	} finally {
		inFlight.delete(url);
	}
}

export async function getAssetObjectUrl(url: string, mimeType?: string): Promise<string> {
	const bytes = await getAssetBytes(url);
	return URL.createObjectURL(new Blob([bytes], mimeType ? { type: mimeType } : undefined));
}

export async function clearAssetCache(): Promise<void> {
	hotCache.clear();
	inFlight.clear();
	resetMetaIndex();
	await clearStore().catch(() => {});
}
